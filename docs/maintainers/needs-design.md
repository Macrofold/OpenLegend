# Future work needing design

**Reviewed October 3, 2026 against `main` at [`b528af6d`](https://github.com/Macrofold/OpenLegend/commit/b528af6d126a9ac500dbe5574642dea87c472c40).** This register preserves practical work suggested by the repository that still needs a scoped design, a consequential product decision, or an evidence-producing experiment before an implementation project can start.

Some ideas have no implementation plan. Others already have a broad task or accepted architecture, but still lack the specific rules and delivery design for the proposed extension. Each entry identifies that distinction. Inclusion alone does not approve a feature, select a price or policy, establish priority, or authorize implementation. The ordered groups below propose a sequence for preparing the missing designs.

The [maintainer index](README.md) remains the route to implementation work. [Open decisions](../../archive/05-project/open-decisions.md) owns unresolved choices; the [research backlog](../../archive/05-project/research-backlog.md) owns empirical questions; [policies to revisit](revisitable-policies.md) owns review triggers for accepted policy. This page tracks the missing preparation and links those owners rather than replacing their records.

Start with [ordered design groups](#ordered-design-groups), [parallel opportunities](#order-and-parallel-opportunities), and [complete coverage](#coverage-of-every-design-need). The original topic index remains: [scalability](#product-scalability-substantial-plans-already-exist), [worlds and communities](#worlds-rules-and-long-lived-communities), [creation and communication](#creation-controls-and-communication), [memory and authored behavior](#memory-shared-history-and-advanced-authored-behavior), [service and creator economy](#commercial-service-creator-ecosystem-and-launch-learning), [optional real-world value](#optional-well-being-and-real-world-value), and [existing plans and deferrals](#existing-designs-and-deliberate-deferrals-to-reuse).

## How to use and maintain this register

- **Needs scoped design:** the idea or direction exists, but the named extension still needs a concrete feature/technical plan. Existing foundation or umbrella tasks retain their scope.
- **Decision before design:** a consequential product or world-policy choice prevents an honest implementation plan. Preserve the current behavior until that choice is made.
- **Conditional experiment:** first select a real problem or adopt an optional direction, then design a bounded study. The result may be to stop, keep the current system, or create a feature project.

**Conditional** means the direction first needs a selected use case or an explicit decision to pursue it; an experiment is not always required. Entry qualifiers describe the missing preparation, not priority or implementation status. IDs stay stable, with additions grouped by subject rather than renumbering earlier items.

For each selected item, recheck its sources against the current implementation and owners. Define the smallest useful capability, its meaningful failure cases, and any remaining decisions. Follow the [design workflow](../../.agents/skills/openlegend-design/SKILL.md) and [feature-documentation structure](../feature-documentation.md) when creating a project: link the feature specification, technical design, focused work IDs, dependencies, completion criteria, and applicable limits inventory. World-specific rules belong with the authored world.

An item leaves the active design queue when that preparation has an adequate owner and delivery breakdown, or when an explicit decision rejects or supersedes it. Keep its ND identifier and a short disposition with replacement links. Design completion does not mean implementation or verification is complete. Add newly discovered gaps here only when an existing detailed project or tracker does not already describe the needed work.

## Ordered design groups

**Proposed design sequence, October 3, 2026, checked against GitHub main at [b50ec6c](https://github.com/Macrofold/OpenLegend/commit/b50ec6ce75f260d68c18ec99d767982c65b0fccb).** This is a complete grouping of the register's 37 ND entries and remaining PS design refinements. The original subject categories below remain navigation; these groups combine related decisions that belong at a similar point in delivery. Broad entries are explicitly split when their parts belong far apart.

The [product roadmap](../../archive/05-project/roadmap.md) owns P1–P7 outcomes. Read the bands below in that general order, taking groups with ready inputs in parallel. A band's label is a design-planning guide, not a requirement to finish every earlier feature before drafting a later one. Named decisions must be settled before dependent designs are signed off, and the existing runtime/evidence gates still apply before offering the behavior. Conditional groups start only for their stated need; leaving one unselected is not a gap to fill with an unwanted feature.

Prioritize useful, complete player activities and the smallest scope faithful to the game. The [canonical repertoire policy](../repertoires/gameplay-priorities.md) keeps practical invention and independent, observation-grounded character consequences inside the first playable experience, alongside readable opposition, exploration and worthwhile rewards. The [28 catalogues](../repertoires/README.md#catalogue-map) are ranked options, not additional mandatory projects; this review does not reorder the accepted design groups or close their acceptance. No crowd, creator workflow, building, generic dice or optional well-being feature blocks the accepted live creative first playable. The [next-priority batch](parallel-batch-02-foundations-and-usability.md) is complete for its recorded scope; the [playable-week tracker](parallel-batch-01-playable-week.md) and existing parents retain any wider qualification. This grouping does not reopen that implementation or turn every existing deferred test into missing design.

DG numbers identify **design batches**, not new implementation tasks or a required count of projects. The ND entries, PS tracker, decision owners and existing subsystem trackers retain their authority. For a broad group, decide its stated common boundary once, then produce separately scoped designs where its families can ship independently. Every selected design still needs its player outcome, meaningful failure, economic burden, explicit scope and delivery breakdown. No technical class/schema design is added by this index.

[Batch 04 — Expeditions and exchange](parallel-batch-04-expeditions-and-exchange.md) selects follow-on children after batch 03: PX01 consumes DG07’s approved first-threat design; PX02/PX04 define immediate barter and paired outings within DG06; PX03 supplies DG01’s place/item exposure; PX05 produces DG13’s missing shelter technical design. This is a proposed allocation, not closure of these design groups or their runtime parents. Its explicit prerequisites preserve the existing band ordering.

[Batch 05 — Adventure, defense and a home](parallel-batch-05-adventure-defense-and-home.md) selects implementation after those assignments: useful expedition rewards, shield defense, DG14's selected practice/coaching consumer, DG13's canopy implementation after PX05, and fishing through world-defined preparation. The [comparison](../projects/parallel-batch-05-adventure-defense-and-home-feature-spec.md#priority-comparison) considers the October 5 designs without automatically promoting libraries, story perspectives or the optional study. AV03 supplies PC02's scoped technical counterpart during delivery; AV04 requires PX05's supplied technical design first. No unanswered developer decision is bypassed with design-only work, and no ND/DG runtime acceptance closes here.

### Reuse the five existing product proposals

The earlier five-topic package did not cover all five register categories. Its proposals are reusable input, not completion of entire ND/PS parents. They are now included in the current main baseline; the links below use their maintained repository paths. The earlier branch at d2cca27 remains historical provenance. Reconcile their current product recommendations with the owning tracker before designing the remaining slice. Do not restart their research or silently treat their proposals as delivered behavior.

| Existing proposal                                                                | Reuse in these groups                                                                                                                                                      |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Continuing NPC lives](../projects/continuing-lives-feature-spec.md)             | [DG02](#dg02--one-resident-who-follows-through), [DG17](#dg17--continuing-communities-clocks-and-quiet-world-funding)                                                      |
| [Attention, crowds and scenes](../projects/attention-and-scenes-feature-spec.md) | [DG02](#dg02--one-resident-who-follows-through), [DG18](#dg18--worthwhile-crowds-and-background-social-scenes), [DG26](#dg26--voice-calls-and-selected-hearing-extensions) |
| [World creation](../projects/world-creation-feature-spec.md)                     | [DG12](#dg12--create-a-world-and-reuse-an-invention); broader community assumptions revisited in [DG17](#dg17--continuing-communities-clocks-and-quiet-world-funding)      |
| [Editable shelters and rain](../projects/editable-shelters-feature-spec.md)      | [DG13](#dg13--editable-shelter-and-useful-places); remaining material/fire design in [DG20](#dg20--heat-ignition-and-material-consequences)                                |
| [Authored stats and checks](../projects/authored-stats-feature-spec.md)          | [DG14](#dg14--useful-competence-and-practice)                                                                                                                              |

### Order and parallel opportunities

| Band                                                  | Roadmap position                         | Groups                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | How to work through it                                                                                                                                                                                                                                                     |
| ----------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Improve the current personal game                 | P1 refinement                            | [DG01](#dg01--actions-and-first-encounters), [DG02](#dg02--one-resident-who-follows-through), [DG03](#dg03--a-useful-demo-and-early-audience-learning), [DG04](#dg04--a-specific-recall-problem), [DG05](#dg05--ending-and-returning-to-a-session)                                                                                                                                                                                                                                                                                 | DG01–DG03 form the default first batch. DG04–DG05 are conditional work that can accompany an observed need. Existing first-playable, PW and parent qualification remain with their owners.                                                                                 |
| 2 — Make shared play worth joining                    | P2                                       | [DG06](#dg06--reciprocal-exchange-and-small-cooperation), [DG07](#dg07--human-participation-and-recoverable-conflict), [DG08](#dg08--finding-a-community-and-participating-publicly), [DG09](#dg09--resident-conduct-for-a-selected-audience), [DG10](#dg10--a-chosen-human-social-experience), [DG11](#dg11--evidence-for-a-selected-well-being-objective)                                                                                                                                                                        | DG06, DG07 and the design of DG08 can proceed together. DG08 must consume the applicable DG07 choices before sign-off. DG09–DG11 run only for their selected audience, social experience or study; they do not impose the whole well-being vision.                         |
| 3 — Broaden creation and expression                   | P3                                       | [DG12](#dg12--create-a-world-and-reuse-an-invention), [DG13](#dg13--editable-shelter-and-useful-places), [DG14](#dg14--useful-competence-and-practice), [DG15](#dg15--an-optional-story-perspective), [DG16](#dg16--a-useful-personal-journal-extension)                                                                                                                                                                                                                                                                           | DG12–DG14 have distinct authoring, material and competence responsibilities and can usually proceed together against current contracts. DG15–DG16 are optional consumers, not gates for those core groups.                                                                 |
| 4 — Make communities last                             | P4                                       | [DG17](#dg17--continuing-communities-clocks-and-quiet-world-funding), [DG18](#dg18--worthwhile-crowds-and-background-social-scenes), [DG19](#dg19--supplies-that-change-over-time), [DG20](#dg20--heat-ignition-and-material-consequences), [DG21](#dg21--injury-illness-and-useful-care), [DG22](#dg22--durable-agreements-and-a-small-world-economy), [DG23](#dg23--characters-changed-by-their-experience), [DG24](#dg24--text-messages-inside-an-authored-world), [DG25](#dg25--deliberate-corrections-and-shared-restoration) | Settle any new clock and unattended-service decisions in DG17 before other groups depend on them. Most other groups can design a first personal/attended slice using today's contracts in parallel. DG18–DG25 are separate additions, not one required simulation package. |
| 5 — Add useful spoken communication                   | P5                                       | [DG26](#dg26--voice-calls-and-selected-hearing-extensions)                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | DG26 is the coordinated communication design. Its distinct media families can be split into delivery work after their shared meaning is settled; basic text communication remains earlier.                                                                                 |
| 6 — Offer sustainable service and wider participation | P6, or earlier for a selected paid offer | [DG27](#dg27--customer-and-supporter-offers), [DG28](#dg28--published-packs-and-creator-revenue), [DG29](#dg29--more-participants-and-travel-between-worlds), [DG30](#dg30--a-creator-fund-and-contributor-governance)                                                                                                                                                                                                                                                                                                             | DG27 and DG29 can proceed independently once their actual operating inputs exist. DG28 consumes the relevant publication and offer decisions. DG30 is a conditional operating program, not an automatic consequence of either.                                             |
| 7 — Choose deeper society and generativity            | P7                                       | [DG31](#dg31--generations-and-deeper-biology), [DG32](#dg32--larger-institutions-and-economic-obligations), [DG33](#dg33--extraordinary-minds-and-life-after-death), [DG34](#dg34--shared-campaigns-with-local-opportunities)                                                                                                                                                                                                                                                                                                      | DG31–DG34 are mostly parallel consumer choices after their named inputs. Their order does not make biology, institutions, unusual minds or campaigns prerequisites for one another.                                                                                        |
| 8 — Insert other expansion only at its trigger        | Independent conditional tracks           | [DG35](#dg35--a-selected-platform-or-offline-capability), [DG36](#dg36--one-useful-application-beyond-the-game)                                                                                                                                                                                                                                                                                                                                                                                                                    | DG35–DG36 can be inserted into any suitable band when a real user or production need exists. Their position here is for navigation, not a requirement to finish the game before investigating them.                                                                        |

### Band 1 — Improve the current personal game

#### DG01 — Actions and first encounters

ND13's ordinary action recommendations, stable menus, remapping and nearby interaction, together with ND18's first encounters with places and inventory items. Design understandable opportunities, consistent selection and useful feedback around actions already supported.

**Start and parallel boundary:** Use current action, inventory and narration contracts. Platform-specific input/lifecycle expansion belongs to DG35. Can run alongside DG02–DG03; presentation consumes what a character may know and do rather than redefining it. **Existing owners:** AC/UIUX, NC/EPR and PO.

**PG03 scoped delivery:** existing contextual menus, complete known discovery and exact selected inventory uses now explain native commitments, retain choices through refresh and distinguish stale/failure states. The October 4 review adds complete later/nested offer/fuel identity, access-checked details and a searchable 40-row initial display with keyboard Show more. [PG03](parallel-batch-03-personal-game.md#pg03--readable-action-discovery) and [PG03 evidence](../verification/player-clarity-ui.md#pg03--action-discovery-and-commitments--october-3-2026) own this ordinary-player slice. Recommendation counting/ranking, key remapping, broader nearby controls and place/item encounter narration remain with ND13/ND18; DG01 is not wholly completed.

#### DG02 — One resident who follows through

PS02 and the personal-play portion of PS04, with the early [compelling-character experience](../projects/compelling-characters-feature-spec.md): one resident whose bodily and psychological experience, identity, memories, relationships, attention and choices form a coherent life. Explicitly include contact, belonging, enjoyment, independent interests and chosen solitude alongside survival. Continued useful activity, interruptions and readable conversation must connect to actual consequences, satisfaction, changed priorities and stopping. Reuse the existing continuing-lives and attention proposals; [CE01–CE05](character-experience.md) owns this integration across the existing subsystem work.

Qualify [complete episodes](../projects/compelling-characters-feature-spec.md#complete-behavioral-flows), including an ordinary afternoon, social approach/refusal, solitary enjoyment, hunger within a larger life, purposeful repetition and interruption/resumption. A plausible prompt, stored feeling, successful meal chain or random activity variety does not by itself establish a compelling character. AG12/CR12 retain the actual comparison and evidence program.

**Start and parallel boundary:** Current actions, evidence and clock behavior are sufficient starting inputs. Neither roofs nor unattended communities are prerequisites. Leave dense gatherings, background social scenes and timed speech to DG18/DG26. **Existing owners:** [CE integration](character-experience.md), AG/CR, ACT/BW, action owners, EPR/HE/NC and PS. Initial character quality belongs here; longer-term personality transformation remains DG23.

#### DG03 — A useful demo and early audience learning

ND26's first audience, honest repeatable demonstration and bounded comprehension/value experiment. Identify the supported creative loop, actual questions, evidence and stop/expand criteria; distinguish preparation from permission to run outreach or spend.

**Start and parallel boundary:** Design the brief against the current playable offering while DG01–DG02 improve it. The demonstrated scope must actually work before its evidence is claimed. Pack portability, a marketplace and a complete paid service are unnecessary; paid-offer validation follows DG27. **Existing owners:** ND26, business/launch decision owners and PD.

#### DG04 — A specific recall problem

Conditional ND20 comparison of current recall, a modest native improvement and optional richer retrieval. Define one consequential repeatable omission, matched histories and correction/forgetting, latency and cost evidence.

**Start and parallel boundary:** Start only when the omission exists. This investigation can run beside any gameplay band using current memory contracts; it does not require DG23's new memory transformations or authorize replacing canonical memories. Stop if the current approach is sufficient. **Existing owners:** CR12/CR13, R11/R19 and memory owners.

#### DG05 — Ending and returning to a session

Conditional ND28: one skippable closing or return experience, personal preferences and any selected notifications. Judge whether it helps players leave and resume an activity they care about.

**Start and parallel boundary:** An observed player need can trigger this during personal play. Use current narration and absence behavior. It neither pauses a shared world nor requires offline communities, a well-being study or journal exports. **Existing owners:** NC and MP; PS only for actual absence-rule changes.

### Band 2 — Make shared play worth joining

#### DG06 — Reciprocal exchange and small cooperation

ND09's immediate barter and ND10's first small recurring arrangement: offers, acceptance, shared supplies/responsibilities and understandable withdrawal. Design the nearby social activity and its resource/consent boundaries together.

**Start and parallel boundary:** Use existing custody, exact-agreement and commitment contracts. No currency, house system or government is required. Durable credit/economy rules and broader institutions belong to DG22/DG32. **Existing owners:** INV-20, PO, BW17 and relevant social owners.

#### DG07 — Human participation and recoverable conflict

[PG05](parallel-batch-03-personal-game.md#pg05--first-threat-encounter-design) now delivers the selected [stag encounter](../worlds/base/first-threat-encounter.md), [player death/scars](../worlds/base/player-death.md), [one-attack lethal review and simulated departure](../worlds/base/player-danger.md), with [recorded evidence](../verification/first-threat-encounter.md). Mike resolved this slice's choices and authorized implementation. DG07 remains open for explicit PvP modes, deliberate luring/indirect harm, rescue/incapacitation and general PS background fairness; these are not runtime prerequisites retroactively added to PG05.

ND11's broader human PvP opt-in, indirect harm, incapacitation/rescue and other return modes, with the matching PS05 background-protection decisions. One group owns the experience of entering danger and losing connection during it.

**Start and parallel boundary:** Build on current protected departure and recoverable-human-death direction. Settle the relevant PS-D01 boundary before dependent shared risks are offered. This can proceed beside trade and creator design; NPC ghosts are DG33, and richer medical rules are DG21. **Existing owners:** BW14, MP, PS05/PS-D01 and lifecycle/time owners.

#### DG08 — Finding a community and participating publicly

ND02 and ND37: discovery, visits/settlement, newcomer character entry, reporting, participant controls, operator evidence and review of mistakes. Design the selected public journey and its actual operating boundaries together.

**Start and parallel boundary:** Current invited multiplayer is the baseline. Adopted public entry consumes DG07's applicable protection decisions and a supported PS06 admission policy; later scale is not required for a small offering. Public operation needs these decisions, but not ND27's optional well-being program. **Existing owners:** MP, PD08/PD10, data/privacy owners, D68 and PS05–PS06.

#### DG09 — Resident conduct for a selected audience

ND27's decisions about official-service conduct versus authored fiction, audience, sensitive conversations, human/AI disclosure and any adopted relationship policy. Separately scope selected resident-memory controls or continuity across model/prompt changes.

**Start and parallel boundary:** Do the relevant audience decision before offering that experience, including before a sensitive or family pilot. Optional archive policies are not blanket launch gates. This group consumes existing memory/privacy authority and does not define DG08's public enforcement powers. **Existing owners:** PD07/PD10, NC/CR, D16/D21 and privacy owners.

#### DG10 — A chosen human social experience

Conditional ND31: one mutually accepted introduction, recurring small group or family participation journey. Specify disclosure/contact consent, attribution, scheduling, opt-out and the appropriate response to problems.

**Start and parallel boundary:** An invited adult pilot can use current multiplayer. New matching/public access needs the corresponding DG08 decisions; sensitive or minor-audience offerings need the relevant DG09 choice. Venues and partner programs require their own selected use case, not a compulsory extension of the first pilot. **Existing owners:** MP, NC, PD and D68.

#### DG11 — Evidence for a selected well-being objective

Conditional ND29: define the actual research question, comparison, opt-in data, retention and interpretation before collecting anything. It may accompany a selected session, journal or human-connection pilot.

**Start and parallel boundary:** Place this beside the feature being studied, whenever that happens. It is independent of ordinary gameplay/cost evaluation and is not a prerequisite for DG05, DG10 or DG16 unless that particular study is selected. Engagement alone does not establish a health benefit. **Existing owners:** Research/measurement decision owners and PD/data/privacy.

**Product proposal prepared, 5 October 2026:** [Optional connection study](../projects/wellbeing-evidence-feature-spec.md) selects a finite feasibility comparison for independently consenting known-friend adults, minimal exploratory questions, private withdrawal and limited interpretation. [WBE01–WBE06](wellbeing-evidence.md) owns delivery and the still-open actual-study decision; no well-being programme, recruitment or data collection is adopted.

### Band 3 — Broaden creation and expression

#### DG12 — Create a world and reuse an invention

ND01's initial world-assembly journey and ND12's bounded local/account-library round trip. Reuse the world-creation proposal; connect a faithful supported opening to retained definitions, dependency inventories, provenance, rights and understandable destination compatibility.

**Product expansion prepared, 5 October 2026:** [The existing creation specification](../projects/world-creation-feature-spec.md#15-dg12-expansion--a-useful-invention-follows-its-creator) now includes the full useful-recipe round trip, original retention, destination choices, independent character knowledge/resources, eligible free release to a known recipient, update/removal behavior and ten additional primary research units. INV-8/EWF11/12 remain the delivery owners; no new shared license or implementation is claimed.

**Start and parallel boundary:** Use qualified current families and existing authoring/admission. World assembly and the library round trip can be designed independently against their shared definition/provenance contract. A ready small start remains valid. Do not require shelters, general stats, public matching or a marketplace. Free publication and reuse belong here; commercial catalogue/distribution and payout integration expand through DG28. **Existing owners:** INV-4/INV-8, EWF11/EWF12 and world-host owners.

#### DG13 — Editable shelter and useful places

ND07's useful light construction, interior/access and home-use decisions with the shelter-relevant exposure/moisture part of ND08. Reuse the shelter proposal for persistent parts, coverage, alteration and chosen use; state which larger structural families remain unsupported.

**Start and parallel boundary:** Start from existing material, work and geometry contracts. Coordinate each later structural family within this same construction owner when selected. Heat/spread is DG20, medical effects DG21, institutions DG32, and additional hearing propagation DG26; none is a universal prerequisite for useful cover. **Existing owners:** INV-6, SW, PO, BW and shared-state owners.

**October 5 product expansion:** [The existing shelter owner](../projects/editable-shelters-feature-spec.md#14-dg13-expansion--make-a-place-use-it-and-change-it) now selects one flat canopy and an adjacent two-bay awning, finite real materials, reversible ties, actual rest/storage/visitor use, explicit construction permissions and complete reclaim/interruption outcomes. [Base-world proposals](../worlds/base/editable-shelters.md) own the material/layout/work/moisture tuning. Product critique preserves a useful first place without penalties or household machinery. PX05 still owes the technical counterpart; INV-6.4 and related runtime acceptance remain open.

#### DG14 — Useful competence and practice

ND03 and ND04's practical-skill slice: one worthwhile action affected by capability, with explicit evidence for practice/teaching and the resulting change. Reuse the stats proposal; predictable competence can suffice and its roof/dice example remains optional.

**Start and parallel boundary:** A selected existing action is the real dependency, so this can move earlier if it improves current play. It does not wait for DG12 or DG13 as a whole. Personality development belongs to DG23; generic learning stays with its existing owner. **Existing owners:** EWF02/EWF04, INV, AC/AE and shared state.

**October 5 product expansion:** [The existing stats owner](../projects/authored-stats-feature-spec.md#16-dg14-expansion--become-more-capable-at-something-worth-doing) now selects useful sling handling, a short finite practice route, an actual inert target and voluntary observed-shot/feedback coaching. [The authored world profile](../worlds/base/practical-competence.md) owns the exact effect and requirements. This explicitly develops ND04's practical slice while preserving separate recipe knowledge, tentative learned methods and personality. [PC](practical-competence.md) owns the new consumer; its technical/runtime tasks remain open.

#### DG15 — An optional story perspective

Conditional ND36: one desired cutaway, distant-event or private-thought presentation, with its audience, spoilers, preferences and the distinction between what the human sees and what the character knows.

**Start and parallel boundary:** Start after ordinary narration is useful and a specific mode is wanted. The source and recipient policy must be expressly selected and its authority qualified before enabling the mode. This is independent of ordinary encounter narration in DG01, voice and deeper memory machinery. **Existing owners:** NC, narration/privacy owners and D57.

**October 5 selected product proposal:** [After you left](../projects/story-perspectives-feature-spec.md) chooses one private-world, external familiar-craft continuation with explicit new disclosure, voluntary reading, bounded candidate retention, historical human-only information and full stop/correction behavior. [NC20](narration-and-conversations.md#nc20--optional-after-you-left-perspective) routes delivery through NC07–NC12. The proposal explicitly tests whether this small scene is worth adding; no private thoughts, multiplayer expansion, extra resident work or runtime permission is implied.

#### DG16 — A useful personal journal extension

Conditional ND30: begin with the selected private export or journal extension and its sources, edits, erasure and art rights. Real-life reflection, print products and shared/family editions are separate later slices within this consumer, only when wanted.

**Start and parallel boundary:** Actual use of the current journal supplies the trigger. A narrow export can proceed without shared-world rewind or a print business. Before expanding to other people's material, resolve its consent and retention boundary; do not promise unrestricted world export. **Existing owners:** NC, data/privacy, art-rights and journal owners.

### Band 4 — Make communities last

#### DG17 — Continuing communities, clocks and quiet-world funding

PS03 with PS05's clock/detail-transition choices and PS06's unattended operating envelope: supported ongoing lives, resource/self-care viability, return evidence and explicit exhausted-funding behavior. Reuse the continuing-lives proposal; revisit ND01's opening assumptions when a larger continuing community is offered.

**Start and parallel boundary:** Consumes DG02's selected activity behavior and applicable DG07 protections. Resolve PS-D03/PS-D06 here before dependent aging, continued absence or customer promises rely on them. Initial personal-world pause rules remain current until this new mode is actually supported. **Existing owners:** PS03/PS05/PS06, activity/agency, simulation-time and work-accounting owners.

#### DG18 — Worthwhile crowds and background social scenes

PS04's larger focus/aggregation and completed social-scene families, with PS06's matching activity-cost and capacity questions. Reuse the attention proposal; define a gathering worth joining and truthful individual exceptions.

**Start and parallel boundary:** Consumes DG02's ordinary attention/evidence boundary. Attended crowds can be designed without unattended service; unattended consumers use DG17's selected rules. Actual timed speech is a separate DG26 decision. Do not select a universal population ceiling from one workload. **Existing owners:** PS04/PS06, EPR/HE/NC, agency and performance owners.

#### DG19 — Supplies that change over time

ND33's selected freshness/preservation loop and the related resource-renewal/scarcity part of ND06. Design useful storage, actual preservation work, depletion/regrowth and how people recognize and respond to those changes.

**Start and parallel boundary:** Use current lots, custody, consumption and the applicable clock. A personal pilot can use today's clock contract; a continuing-world version consumes DG17's assignments. Generations are DG31. Avoid adding spoilage or renewable abundance merely to justify a new system. **Existing owners:** BW, PO, INV, shared state and simulation-time.

#### DG20 — Heat, ignition and material consequences

The remainder of ND08: a selected coarse heating/ignition/fuel/spread/extinguishing family, actual damage and useful material transformations. Carry forward DG13's moisture/coverage decisions without making every wetness or thermal consumer mandatory.

**Start and parallel boundary:** Choose a concrete playable interaction and its real materials first. Consume applicable clock, geometry and human-protection contracts; detailed biology and a full structural solver are unnecessary. This is separate from DG19 so food preservation need not wait for general fire propagation. **Existing owners:** INV-6, BW, PO/SW, shared-state and time owners.

#### DG21 — Injury, illness and useful care

ND05's first selected body/condition/treatment loop, observable symptoms, uncertainty, actual resources and consequences. Design a worthwhile activity around help or recovery without requiring deep anatomy.

**Start and parallel boundary:** Use current actor/state owners and DG07's human recovery boundary for affected human outcomes. Care can proceed without general fire, a complete disease model or NPC ghosts. Deeper biological/life-stage extensions are reconsidered with DG31 when their consumer exists. **Existing owners:** ACT/BW, shared state, actions and lifecycle owners.

#### DG22 — Durable agreements and a small world economy

ND09's chosen currency and deferred-delivery/default rules, and ND10's sparse persistent group/property/obligation records. Extend DG06's actual exchanges and cooperation into a useful multi-session arrangement.

**Start and parallel boundary:** Use existing agreement, custody and identity contracts. Decide money issuance/sinks only if currency is selected. This group is independent of real-money service billing. Broader governments, credit/escrow institutions and political powers are DG32 rather than prerequisites for a modest economy. **Existing owners:** INV-20, PO/BW, social/state owners and D11/D18.

#### DG23 — Characters changed by their experience

ND04's personality-change slice and ND19's older-memory transformation or selected dream reinterpretation. Design how experiences alter interpretation and dispositions while preserving factual provenance, obligations and independent decisions. [DG02](#dg02--one-resident-who-follows-through) and [CE](character-experience.md) already own a multidimensional, compelling initial character and ordinary experience-to-choice continuity; those requirements do not wait for this later transformation work.

**Start and parallel boundary:** Use current memory, appraisal and correction/forgetting contracts. No numerical skill system or external retrieval service is required. DG25 owns deliberate changes to shared history; this group changes recollection/interpretation, not what actually occurred. **Existing owners:** ACT07/ACT08, CR06/CR09 and memory/provenance owners.

#### DG24 — Text messages inside an authored world

ND14's contacts and asynchronous text journey: a real world affordance, addressing, delivery/read state, availability, retention and who learns the message.

**Start and parallel boundary:** Use existing identity and conversation contracts. Keep remote messages distinct from local hearing and account metadata. Calls belong to DG26, so text need not wait for media. Contact and delivery meanings become the input to that later call design. **Existing owners:** NC/MP, world affordance and privacy owners.

#### DG25 — Deliberate corrections and shared restoration

Conditional ND17 and ND35. First settle the narrow common decision about attributed correction versus replacing history, affected people and private evidence. Then scope speech re-authoring and shared-world/private-history restoration as independently selectable designs.

**Start and parallel boundary:** Only start the affected design when that administrative or shared/cloud experience is wanted. Ordinary new-event speech corrections, current save/load and operational backups already have owners. Neither special feature is a gate for normal multiplayer; history-changing consumers must agree before sign-off. **Existing owners:** HE, SL10, NC/CR, data/privacy and D60/D66.

### Band 5 — Add useful spoken communication

#### DG26 — Voice, calls and selected hearing extensions

ND15, ND14's calls and the selected ND16 propagation/recognition families. Settle audio, committed words, transcripts, speed, interruptions and per-listener eligibility before dividing playback, speech input and human voice.

**Start and parallel boundary:** Phone calls consume DG24's contact/delivery choices; local voice does not need phones. Room effects use actual geometry. A narrow earlier need for waking, language or rooms may pull only that ND16 slice forward. Text remains complete and no full acoustics catalogue is required. **Existing owners:** HE/NC/MP, spatial/world-family and spending owners; PS04 for timed speech.

### Band 6 — Offer sustainable service and wider participation

#### DG27 — Customer and supporter offers

ND22, ND26's paid-offer/renewal experiment and a specifically selected ND24 supporter offer. Define service/allowance terms, exhausted funding, fulfillment, cancellation and, if offered, dedication redemption, transfer, attribution and retirement promises.

**Start and parallel boundary:** Can move earlier for a real bounded paid test; use the actual demonstrated offering and existing payment gates. Continued-world promises consume DG17's funding decision. Patron benefits are optional and do not hold up an ordinary subscription; marketplace allocation is DG28 and grant governance DG30. **Existing owners:** PD10, billing/entitlement and INV-13, D17/D35/D37 and PS-D06.

#### DG28 — Published packs and creator revenue

ND23 with ND12's broader publication/distribution, rights and cross-service access/retention integration. Design a selected catalogue and creator-payment model against actual reusable packs, with refunds/fraud, attribution and reconciliation.

**Start and parallel boundary:** Reuse DG12's dependency/provenance/permission vocabulary and DG27's applicable offer/payment decisions. Free libraries and noncommercial publication do not wait for payouts; self-hosted synchronization may be scoped independently when requested. A creator fund is a different program in DG30. **Existing owners:** INV-8/EWF11, PD10, rights/payment owners and D35/D36/D43/D44.

#### DG29 — More participants and travel between worlds

PS06's wider measured admission/economics and PS07's regions, protected domains, visits, imports, clocks and safe return; refine the applicable PS05 transition rules. Include PS08's comparison of concentrated demand, many small worlds, mass return and long histories.

**Start and parallel boundary:** Consume the actual offered workloads: ordinary local behavior from DG02, with DG17/DG18 extensions only where relevant, plus applicable protection, admission and entry decisions and DG12's carried-definition/rights boundary. Shared gameplay restoration uses the DG25 decision if offered. A small visit need not wait for unattended communities, crowds, a marketplace or a campaign. **Existing owners:** PS05–PS08, MP/access, transfer/data, time and performance owners.

#### DG30 — A creator fund and contributor governance

Conditional ND25: a real fund budget, eligibility, milestones, rights, payout evidence, conflicts and advisory versus binding influence. Design the operating program before deciding whether software is needed.

**Start and parallel boundary:** Start when a concrete program and sustainable funding are selected; it may run alongside marketplace or supporter design using their existing rights/payment meanings. Neither subscriptions nor dedications automatically creates a grant or voting program. **Existing owners:** D37, program/financial/rights and platform-authority owners.

### Band 7 — Choose deeper society and generativity

#### DG31 — Generations and deeper biology

ND06's remaining life stages, reproduction/families, population change and caregiving, with any specifically selected deeper ND05 biology. Design one coherent lifecycle and its food, housing, social and operating consequences.

**Start and parallel boundary:** Use current food, clock and lifecycle contracts for a bounded first design. Consume DG17's new clock/population-funding decisions and DG19's resource rules only where the selected lifecycle needs those extensions, and the actual DG13/DG21 housing/care capabilities used. Resolve audience/family-content choices before the affected feature. It does not require new spoilage, a full ecosystem, government or universal anatomy. **Existing owners:** ACT/BW, PS, housing/care consumers and D16/D23/D27.

#### DG32 — Larger institutions and economic obligations

ND10's broader authored institutions and any selected ND09 credit, escrow, interest or dispute structures. Start from one real organization or transaction need; define only the authority, property and obligations that it uses.

**Start and parallel boundary:** Build on relevant DG06/DG22 agreement/group rules. This can proceed alongside generations without depending on biology or a compulsory currency. Fictional power never grants platform moderation, billing or private-data authority. **Existing owners:** INV-20, PO/social/world-policy owners and D11/D18.

#### DG33 — Extraordinary minds and life after death

ND11's NPC ghost/summoning/ordinary-revival slice and ND21's selected mental-effect, telepathy or shared-mind families. Their common design boundary is character identity, who controls a mind/body, retained experience and authorized disclosure.

**Start and parallel boundary:** Treat these as separate selectable authored families with that shared boundary, not one mandatory magic system. Existing agency, lifecycle and provenance supply the starting contract. A requested world premise may bring a particular family forward; human recovery does not wait for ghosts, and a shared mind does not require revival. **Existing owners:** BW15, ACT/AG/CR, EWF10/INV and evidence/privacy owners.

#### DG34 — Shared campaigns with local opportunities

PS07's forecast canonical campaigns, timing/revision promises, local participation and contribution recognition, with the relevant PS08 mature-scale and recovery evidence.

**Start and parallel boundary:** Use DG29's cross-world/travel contracts where the selected campaign spans worlds, plus the actual participation/capacity rules. Do not require governments, generations or special mental powers merely because a campaign has many people. Local opportunities can be designed against current supported worlds first. **Existing owners:** PS07/PS08, campaign/access/time, data and existing scale owners.

### Band 8 — Insert other expansion only at its trigger

#### DG35 — A selected platform or offline capability

Conditional ND34 and the applicable later ND13 device/control extensions. Distinguish a desktop package, a replacement native/console client and offline simulation; select the actual audience problem before committing to one.

**Start and parallel boundary:** Insert at the point where audience or production evidence warrants it, not automatically after P7. Reuse current rendering/input and account contracts. Offline operation separately needs a local host/provider policy; a desktop package does not require offline AI or a new engine. **Existing owners:** SW10, UIUX/AC, MP/PD and host/provider owners.

#### DG36 — One useful application beyond the game

Conditional ND32: select one learning, rehearsal, writing, agent-evaluation or external-developer use case, its actual user and evidence of useful transfer or repeated demand.

**Start and parallel boundary:** Insert alongside the mature underlying capability when that need exists. Define rights, responsibility, feedback and delivery/support for that one offer. It does not require P7, a general SDK, a clinical product or all of the ideation library. **Existing owners:** D25/R16 and the selected capability/product/research owners.

### Shared decisions that keep parallel work separate

| Shared meaning                                  | One place to decide it; how other groups consume it                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What a character does, notices and knows        | DG02 refines activity and ordinary attention through AG/EPR/HE/NC. DG01 presents existing opportunities; DG18 groups actual evidence; DG26 extends selected speech/hearing behavior. None gains authority to invent another character's action or private knowledge.                                                                                  |
| Human participation, time and continued funding | DG07 owns the selected human-risk/absence experience; DG17 owns new clock assignments and quiet-world operating behavior through PS. DG08/DG29 consume those decisions for entry/capacity, and DG27 translates the selected service into customer terms. They must not independently choose conflicting pause, protection or exhausted-funding rules. |
| Material identity and consequences              | DG13 owns construction/coverage choices; DG19 food/resource change; DG20 thermal effects; DG21 bodily effects. Reuse the existing PO/state/time owners and distinguish each effect's inputs. A second writable moisture, ownership or work-progress value is not a parallel-work shortcut.                                                            |
| Facts, memories and changed history             | DG23 designs subjective recollection/trait changes; DG25 owns the selected correction/rewind decision through HE/SL/data. DG04 evaluates recall using current canonical evidence. DG09/DG15/DG16 consume existing disclosure, correction and forgetting rules; they do not independently redefine the historical event.                               |
| Reuse rights, money and attribution             | DG12 establishes reusable definition/dependency/provenance meanings. DG28 adds selected publication/marketplace terms, DG27 customer/supporter fulfillment, and DG30 the fund program. Resolve their actual shared rights/retention vocabulary once in INV/PD and the decision owner; fictional currency/groups in DG06/DG22/DG32 remain separate.    |
| Public service versus authored social behavior  | DG08 defines the selected participation/enforcement journey with existing platform owners. DG09 defines only an adopted resident/audience policy. DG10 consumes the relevant entry/contact/audience choices for its pilot. No optional conduct charter, fictional government or research program silently changes operator powers.                    |

These are division-of-responsibility rules for the requested design batches, not instructions for workers to negotiate competing contracts. A group can research its independent questions while an input is pending; it must identify that pending input and cannot present the dependent design as settled. Keep detailed shared decisions in the existing canonical owner and reference them from the feature designs. Reconcile overlapping ND/PS slices and owner documents before a combined design is considered complete.

### Coverage of every design need

Every original ND ID appears below. Multiple groups mean explicitly different slices, not duplicate ownership or permission to close the whole entry after the first slice. A single group may still select one useful first family and preserve its later expansion decision under the same owner.

| Need                                                                                     | Design group or groups                                                                                                                                                             | Split or scope reminder                                                                    |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [ND01](#nd01--assemble-a-new-world-from-a-creators-premise)                              | [DG12](#dg12--create-a-world-and-reuse-an-invention)                                                                                                                               | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND02](#nd02--discover-a-community-settle-there-and-enter-as-a-character)                | [DG08](#dg08--finding-a-community-and-participating-publicly)                                                                                                                      | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND03](#nd03--world-authored-stats-checks-and-their-effects)                             | [DG14](#dg14--useful-competence-and-practice)                                                                                                                                      | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND04](#nd04--experience-shaped-personality-and-practical-skill-growth)                  | [DG14](#dg14--useful-competence-and-practice), [DG23](#dg23--characters-changed-by-their-experience)                                                                               | Practical skill → later personality change.                                                |
| [ND05](#nd05--richer-bodies-illness-and-care)                                            | [DG21](#dg21--injury-illness-and-useful-care), [DG31](#dg31--generations-and-deeper-biology)                                                                                       | One useful care loop → selected deeper biology.                                            |
| [ND06](#nd06--ecology-aging-and-generations)                                             | [DG19](#dg19--supplies-that-change-over-time), [DG31](#dg31--generations-and-deeper-biology)                                                                                       | Resource renewal/scarcity → generations and population.                                    |
| [ND07](#nd07--editable-buildings-that-become-usable-homes)                               | [DG13](#dg13--editable-shelter-and-useful-places)                                                                                                                                  | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND08](#nd08--material-weather-heat-and-fire-interactions-beyond-campfires)              | [DG13](#dg13--editable-shelter-and-useful-places), [DG20](#dg20--heat-ignition-and-material-consequences)                                                                          | Shelter exposure/moisture → thermal/fire behavior.                                         |
| [ND09](#nd09--negotiated-barter-currency-and-durable-commercial-promises-inside-a-world) | [DG06](#dg06--reciprocal-exchange-and-small-cooperation), [DG22](#dg22--durable-agreements-and-a-small-world-economy), [DG32](#dg32--larger-institutions-and-economic-obligations) | Immediate barter → modest currency/deferred agreements → selected complex obligations.     |
| [ND10](#nd10--persistent-groups-shared-ownership-and-in-world-institutions)              | [DG06](#dg06--reciprocal-exchange-and-small-cooperation), [DG22](#dg22--durable-agreements-and-a-small-world-economy), [DG32](#dg32--larger-institutions-and-economic-obligations) | Small cooperation → persistent sparse groups → broader institutions.                       |
| [ND11](#nd11--human-conflictrecovery-and-npc-ghost-continuity)                           | [DG07](#dg07--human-participation-and-recoverable-conflict), [DG33](#dg33--extraordinary-minds-and-life-after-death)                                                               | Human participation/recovery → separately selected NPC ghosts.                             |
| [ND12](#nd12--cross-world-invention-libraries-and-usable-pack-publishing)                | [DG12](#dg12--create-a-world-and-reuse-an-invention), [DG28](#dg28--published-packs-and-creator-revenue)                                                                           | Initial library/free reuse → broader publication and commercial integration.               |
| [ND13](#nd13--stable-action-recommendations-and-complete-control-customization)          | [DG01](#dg01--actions-and-first-encounters), [DG35](#dg35--a-selected-platform-or-offline-capability)                                                                              | Ordinary controls/discovery → device-specific expansion when selected.                     |
| [ND14](#nd14--in-world-remote-messages-and-calls)                                        | [DG24](#dg24--text-messages-inside-an-authored-world), [DG26](#dg26--voice-calls-and-selected-hearing-extensions)                                                                  | Asynchronous text → calls.                                                                 |
| [ND15](#nd15--audible-npc-dialogue-microphone-input-and-proximity-voice)                 | [DG26](#dg26--voice-calls-and-selected-hearing-extensions)                                                                                                                         | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND16](#nd16--hearing-and-communication-beyond-direct-path-speech)                       | [DG26](#dg26--voice-calls-and-selected-hearing-extensions)                                                                                                                         | Selected hearing extension; bring a concrete earlier need forward without requiring voice. |
| [ND17](#nd17--correcting-speech-that-characters-have-already-perceived)                  | [DG25](#dg25--deliberate-corrections-and-shared-restoration)                                                                                                                       | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND18](#nd18--first-encounter-narration-for-places-and-inventory-items)                  | [DG01](#dg01--actions-and-first-encounters)                                                                                                                                        | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND19](#nd19--older-memory-transformation-and-dream-reinterpretation)                    | [DG23](#dg23--characters-changed-by-their-experience)                                                                                                                              | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND20](#nd20--a-bounded-richer-memory-retrieval-comparison)                              | [DG04](#dg04--a-specific-recall-problem)                                                                                                                                           | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND21](#nd21--mental-effects-shared-minds-and-selective-telepathy)                       | [DG33](#dg33--extraordinary-minds-and-life-after-death)                                                                                                                            | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND22](#nd22--commercial-offers-and-the-customer-entitlement-lifecycle)                  | [DG27](#dg27--customer-and-supporter-offers)                                                                                                                                       | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND23](#nd23--creator-revenue-allocation-and-marketplace-operation)                      | [DG28](#dg28--published-packs-and-creator-revenue)                                                                                                                                 | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND24](#nd24--patron-recognition-dedications-and-durable-attribution)                    | [DG27](#dg27--customer-and-supporter-offers)                                                                                                                                       | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND25](#nd25--creator-grants-and-contributorpatron-governance)                           | [DG30](#dg30--a-creator-fund-and-contributor-governance)                                                                                                                           | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND26](#nd26--a-bounded-commercial-test-and-repeatable-product-demonstration)            | [DG03](#dg03--a-useful-demo-and-early-audience-learning), [DG27](#dg27--customer-and-supporter-offers)                                                                             | Early demo/value evidence → paid-offer/renewal evidence.                                   |
| [ND27](#nd27--resident-conduct-audience-and-sensitive-conversation-policy)               | [DG09](#dg09--resident-conduct-for-a-selected-audience)                                                                                                                            | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND28](#nd28--optional-session-endings-play-rhythms-and-returning-experience)            | [DG05](#dg05--ending-and-returning-to-a-session)                                                                                                                                   | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND29](#nd29--measure-whether-play-supports-well-being-and-human-connection)             | [DG11](#dg11--evidence-for-a-selected-well-being-objective)                                                                                                                        | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND30](#nd30--personal-journal-extensions-and-exported-or-printed-editions)              | [DG16](#dg16--a-useful-personal-journal-extension)                                                                                                                                 | Narrow useful extension/export first; print and shared editions only on demand.            |
| [ND31](#nd31--human-introductions-small-groups-and-family-participation)                 | [DG10](#dg10--a-chosen-human-social-experience)                                                                                                                                    | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND32](#nd32--learning-creation-and-other-uses-beyond-the-game)                          | [DG36](#dg36--one-useful-application-beyond-the-game)                                                                                                                              | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND33](#nd33--food-freshness-spoilage-and-preservation)                                  | [DG19](#dg19--supplies-that-change-over-time)                                                                                                                                      | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND34](#nd34--additional-distribution-platforms-and-offline-play)                        | [DG35](#dg35--a-selected-platform-or-offline-capability)                                                                                                                           | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND35](#nd35--shared-world-restoration-and-private-history)                              | [DG25](#dg25--deliberate-corrections-and-shared-restoration)                                                                                                                       | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND36](#nd36--optional-narrative-perspectives-and-distant-event-cutaways)                | [DG15](#dg15--an-optional-story-perspective)                                                                                                                                       | Retain the entry's full scope and any conditional selection requirement.                   |
| [ND37](#nd37--public-world-reporting-participation-controls-and-operator-authority)      | [DG08](#dg08--finding-a-community-and-participating-publicly)                                                                                                                      | Retain the entry's full scope and any conditional selection requirement.                   |

The existing scalability project is also fully routed; its original tracker remains the delivery owner.

| Existing scalability work | Design groups and retained boundary                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PS01                      | Documentation foundation already complete; no new design batch restarts it.                                                                                                                                                                                                                                                                                                                                                                   |
| PS02                      | [DG02](#dg02--one-resident-who-follows-through); selected coarse-family extensions feed [DG17](#dg17--continuing-communities-clocks-and-quiet-world-funding).                                                                                                                                                                                                                                                                                 |
| PS03                      | [DG17](#dg17--continuing-communities-clocks-and-quiet-world-funding).                                                                                                                                                                                                                                                                                                                                                                         |
| PS04 / PS-D02             | [DG02](#dg02--one-resident-who-follows-through) for local attention; [DG18](#dg18--worthwhile-crowds-and-background-social-scenes) for crowds/scenes; [DG26](#dg26--voice-calls-and-selected-hearing-extensions) for any selected actual speech-timing/media extension.                                                                                                                                                                       |
| PS05 / PS-D01 / PS-D03    | [DG07](#dg07--human-participation-and-recoverable-conflict) for human participation; [DG08](#dg08--finding-a-community-and-participating-publicly) for initial entry; [DG17](#dg17--continuing-communities-clocks-and-quiet-world-funding) for clocks/detail transitions; [DG29](#dg29--more-participants-and-travel-between-worlds) for wider travel.                                                                                        |
| PS06 / PS-D06             | [DG08](#dg08--finding-a-community-and-participating-publicly) for initial admission; [DG17](#dg17--continuing-communities-clocks-and-quiet-world-funding) for quiet operation/funding; [DG18](#dg18--worthwhile-crowds-and-background-social-scenes) for a chosen crowd; [DG29](#dg29--more-participants-and-travel-between-worlds) for growth. [DG27](#dg27--customer-and-supporter-offers) consumes the service promise for customer terms. |
| PS07 / PS-D04 / PS-D05    | [DG29](#dg29--more-participants-and-travel-between-worlds) for domains/visits; [DG34](#dg34--shared-campaigns-with-local-opportunities) for forecast campaigns.                                                                                                                                                                                                                                                                               |
| PS08                      | Refine relevant evidence alongside each offered scope, with broader population/history comparisons in [DG29](#dg29--more-participants-and-travel-between-worlds) and campaign cases in [DG34](#dg34--shared-campaigns-with-local-opportunities). Qualification is not postponed until the final band.                                                                                                                                         |

Existing art, hosting, data, agency, current survival, family inspection, promise controls and other already-designed work remains in [the reuse/deferral table](#existing-designs-and-deliberate-deferrals-to-reuse) below. These are dependencies or parallel delivery work when needed, not omitted ND entries or new design projects.

## Product scalability: substantial plans already exist

The [product-scalability suite](../product-scalability/README.md), paired [feature specification](../projects/product-scalability-feature-spec.md) and [technical design](../projects/product-scalability-tech-design.md), [PS01–PS08 tracker](product-scalability.md), and [limits inventory](../limits/product-scalability.md) already cover this strategic direction. PS01 records documentation completion; PS02–PS08 remain proposed runtime work. This is not an untracked feature family.

The table makes the remaining design work easy to find without creating a second set of PS tasks. [PS-D01–PS-D06](../../archive/05-project/open-decisions.md#product-scalability-integration-choices) remain the owners of the consequential choices.

| Topic                                                 | Preparation still required within the existing plan                                                                                                                                                                                                  | Existing home                                                                                                           |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Continuing lives and different simulation resolutions | Select the first supported activity families, their coarse execution and interruption behavior, and truthful fallback for unsupported combinations. Representation, scheduling and promotion/demotion contracts already exist.                       | [Background progression](../product-scalability/background-progression.md); PS02–PS03 and relevant PS05 work            |
| Attention, crowds and scenes                          | Select initial sensory/scene families, stable focus, exact-language exceptions, when characters decide independently or within a shared scene, and AI model tiers for characters supported by quality/cost evidence.                                 | [Attention and scenes](../product-scalability/attention-and-scenes.md); PS04, PS-D02                                    |
| Absence, protection and entering detailed simulation  | Resolve supported background harms, encounter entry/exit, standing defenses, reconnect, and a finite end to dangerous-logout continuation. Preserve the current human protection/recovery contract.                                                  | [Participation and protection](../product-scalability/participation-and-protection.md); PS05, PS-D01                    |
| Mechanical, calendar and real-time clocks             | Assign needs, aging, work, memories, appointments and campaigns to explicit clocks, including restart and shared-economy consequences.                                                                                                               | [Time and detail targets](../simulation-time.md); PS05, PS-D03                                                          |
| Players per region and activity-specific capacity     | Qualify interaction-cost envelopes and settle fair admission for parties, residents, returning players and growing effects. No universal player-per-region number is selected here. Player discovery and settlement policy is the separate ND02 gap. | [Capacity and economics](../product-scalability/capacity-and-economics.md); PS06, D61, existing performance/data owners |
| Connected worlds and protected domains                | Specify entry/build/damage/campaign rights, imports and powers, clock/economy compatibility, and safe arrival when crowded.                                                                                                                          | [Worlds and belonging](../product-scalability/worlds-and-belonging.md); PS07 with PS05–PS06, PS-D04                     |
| Shared campaigns and local opportunities              | Select forecast notice/revision promises, time-zone coverage, resident/reconnect access and contribution recognition while preserving one canonical outcome.                                                                                         | [Shared campaigns](../product-scalability/shared-campaigns.md); PS06–PS07, PS-D05                                       |
| Funding quiet worlds                                  | Decide funded unattended activity and explicit behavior when money or capacity runs out; separate continued simulation from retained history. Coordinate customer terms with ND22.                                                                   | [Capacity and economics](../product-scalability/capacity-and-economics.md); PS03/PS06, PS-D06 and D04/D17/D35           |

These refinements should be completed in the existing PS project and decision owners before their affected slices are implemented. Elapsed-time integration, encounter optimization, ordinary absence handling and regional data ownership also have existing designs; their remaining delivery is not a reason to restart them here.

**October 3 product proposal, revised after game-first critique:** [Continuing NPC lives](../projects/continuing-lives-feature-spec.md) first improves one resident's independent activity and the player's experience of returning during active play. Quiet communities, absence and funded service remain later qualified scope. PS-D choices and PS02–PS03 runtime delivery remain open. The [package sequence and playability gates](../projects/five-product-feature-specs.md#game-first-delivery-sequence) preserve the accepted live invention loop and current personal pause policy.

[Attention, crowds and scenes](../projects/attention-and-scenes-feature-spec.md) first improves effortless directed conversation and useful interruptions at the current scale. Busy crowds, independent group scenes and timed speech are separately justified expansions through PS04/PS-D02. Existing hearing semantics, technical design and runtime checkboxes remain unchanged.

## Worlds, rules and long-lived communities

### ND01 — Assemble a new world from a creator's premise

**Needs scoped design; accepted creator experience.** Source: [a short creator flow with substantial defaults](../../archive/03-design-proposals/world-creation-and-discovery.md#a-short-creator-flow-with-substantial-defaults-behind-it), [D39](../../archive/05-project/open-decisions.md) and [R23](../../archive/05-project/research-backlog.md#r23--p1--creation-defaults-consistent-discovery-and-future-influences).

**Existing coverage:** [INV-4.10](inventions-and-world-evolution.md#inv-4--give-the-creator-useful-scoped-world-investigation-and-workshop-tools) and [EWF12](extensible-world-foundation.md#ewf12--runtime-to-world-agent-authoring-and-explanation-bridge) cover supported module authoring and explanation; invention admission and the constitution have their own owners. They do not yet provide the complete initial world-assembly journey.

**Needed before an implementation project:** define premise/default selection, a few consequential questions, population/geography/starting knowledge, visible assumptions, compatible initial rules, and a clear readiness decision. Specify retained drafts, unsupported essential mechanics, conflicting defaults, failed/interrupted creation and the handoff to the current world host. Reuse existing authoring and validation instead of creating a second installer or admission system.

**October 3 product proposal, revised after game-first critique:** [Creating a playable world from a premise](../projects/world-creation-feature-spec.md) offers optional compact creation around a qualified small opening and judges the result by worthwhile play. The accepted personal MVP is sufficient initial scope; six residents are a later community hypothesis, not a release floor. Readiness, selective revision, permissions and actual costs remain required for the selected candidate. [WC limits](../limits/world-creation.md) retain boundaries. Technical design and INV-4.10/EWF12 delivery remain open.

**DG12 expansion, 5 October:** the same specification now makes purpose, useful capability gain and continuation explicit at entry, and connects the new-world candidate to ND12’s exact retained-invention reuse. The initial opening remains small and independent of a marketplace or larger society.

### ND02 — Discover a community, settle there and enter as a character

**Decision before design.** Sources: [worlds and belonging](../product-scalability/worlds-and-belonging.md), especially visiting, settlement and renewed participation; [D68 — world entry beyond invites](../../archive/05-project/open-decisions.md#d68--world-entry-beyond-invites).

**Existing coverage:** [multiplayer](multiplayer.md) already owns account/character control, invitations, characterless sessions and return. PS05–PS07 cover safe arrival, capacity and federation; [production data](production-data.md) owns infrastructure and discovery projections. None selects the player-facing matching or settlement policy. Open public sign-up was explicitly excluded from the earlier entry implementation.

**Needed before an implementation project:** choose how players discover or are recommended communities, what information is public, when a new community is offered, and how they join an existing person or create an authored starting character. Resolve the relevant D68 choices, abuse controls, promotion from characterless access, newcomer roles and a perspective-correct return journey. Do not silently equate public discovery with permission to join.

### ND03 — World-authored stats, checks and their effects

**Needs scoped design.** Sources: [player-designed stats](../../archive/03-design-proposals/agents-and-social-simulation.md#player-designed-stats) and the [world-module runtime](../../archive/07-technical-architecture/world-module-runtime.md).

**Existing coverage:** [EWF02/EWF04](extensible-world-foundation.md) provide typed state and generic presentation; the [state-contribution project](state-contributions.md) already supplies shared numerical ownership. A configurable attribute is not a complete rule for resolving a contested action or changing its outcome.

**Needed before an implementation project:** select one useful stat/check family and define authoring schemas, ranges/defaults, modifiers, opposed or threshold checks, randomness, interpretation and allowed effects. Separate a displayed trait from an enforceable world rule; explain how actions, AI context and player feedback consume the result. Hand the selected family to EWF/INV and the existing action/state owners with concrete scenarios and limits.

**October 3 product proposal, revised after game-first critique:** [World-authored stats, checks and consequences](../projects/authored-stats-feature-spec.md) requires a demonstrated useful action before introducing generalized checks. Predictable competence effects are valid; the finite roof/2d6 example and arithmetic remain an optional worked candidate. Actual materials, time, help, attempts and known outcomes still govern any chosen method. [ST limits](../limits/authored-stats.md) retain candidate tuning and the simpler decisive-step scope. The October 5 DG14 expansion now selects a finite sling-handling progression consumer under [PC](practical-competence.md), using the existing shot uncertainty rather than adding dice. Technical design and consumer qualification remain open; no routine action becomes uncertain and broader ND04 progression/personality stays separate.

### ND04 — Experience-shaped personality and practical skill growth

**Needs scoped design.** Sources: [personality and experience](../../archive/03-design-proposals/agents-and-social-simulation.md#personality-and-experience), [learning through ordinary interaction](../../archive/03-design-proposals/agents-and-social-simulation.md#learning-through-ordinary-interaction), and F07/F48 in the [product baseline](../../archive/01-requirements/product-baseline.md).

**Existing coverage:** [ACT07/ACT08](actor-model.md) cover appraisals and directional social continuity; [cognition](cognition-redesign.md) owns knowledge/reflection; [action experience](action-experience.md) already tracks learned methods and their evidence. Those foundations do not select numerical skill progression or personality-change rules.

**Needed before an implementation project:** decide which experience changes which trait or competence, whether changes are numerical or descriptive, and how practice, teaching, hearsay and observation differ. Define attribution, uncertainty, change/reversal rules and actual effects on supported actions without forcing decisions from trait labels. Keep generic method learning with AE and select world-specific progression separately.

**October 5 selected practical-skill proposal:** DG14 now specifies what a real sling release, observation, completed coaching episode and hearsay each establish, plus the finite resulting effect, privacy, correction and absence rules in the [existing stats specification](../projects/authored-stats-feature-spec.md#16-dg14-expansion--become-more-capable-at-something-worth-doing). [PC](practical-competence.md) tracks only that new consumer. Personality change, generic method teaching and broader skill progression remain open.

### ND05 — Richer bodies, illness and care

**Conditional scoped design.** Sources: [physical state](../../archive/03-design-proposals/agents-and-social-simulation.md#physical-state), F03 in the [product baseline](../../archive/01-requirements/product-baseline.md), and [conditional capability expansion](extensible-world-foundation.md#ewf10--conditional-capability-expansion-review).

**Existing coverage:** the [actor model](actor-model.md), [base-world survival](../worlds/base/survival.md) and current status-effect/state systems already support living actors, needs, damage and selected conditions. Body-part health, disease, richer injuries and treatment are broader proposed behavior.

**Needed before an implementation project:** choose one playable care or injury loop, its body representation, causes, observable symptoms, treatment and consequences. Specify what actors can know, how severity and time evolve, and how the rules interact with death/recovery, saved state and resource use. Do not turn every body-state example into a required subsystem or assume a generic attribute framework supplies biological behavior.

### ND06 — Ecology, aging and generations

**Decision before design.** Sources: [ecology, aging, families and absence](../../archive/03-design-proposals/world-and-player-experience.md#ecology-aging-families-and-absence), [time and simulation speed](../../archive/03-design-proposals/time-and-simulation-speed.md), and D16/D23/D27 in [open decisions](../../archive/05-project/open-decisions.md).

**Existing coverage:** native resources, animals and survival have [BW/ACT](base-world.md) owners; objective family facts already exist. PS03/PS05 and PS-D03 own background execution and future clock assignments. The old uniform-clock examples do not settle the newer separate-calendar option.

**Needed before an implementation project:** select the first ecological or generational loop; define regrowth/scarcity, life stages, population change, caregiving and their housing/food/compute demands. Resolve audience and family-content boundaries before related features. Specify observable causes of collapse, useful intervention and population admission without promising automatic abundance or survival. Keep these authored-world choices separate from the generic simulation scheduler.

### ND07 — Editable buildings that become usable homes

**Needs scoped design under an existing umbrella.** Sources: [buildings are assemblies, homes are places people use](../../archive/03-design-proposals/evolving-materials-and-construction.md#buildings-are-assemblies-homes-are-places-people-use), [D31](../../archive/05-project/open-decisions.md) and [R21](../../archive/05-project/research-backlog.md#r21--p1--evolving-materials-construction-and-fire).

**Existing coverage:** [INV-6.1/6.2/6.4](inventions-and-world-evolution.md) retain materials/construction work; [persistent objects](persistent-objects.md), spatial geometry and state contributions supply foundations. Current camp containers and construction-related primitives do not amount to an implemented modular-home system.

**Needed before an implementation project:** select the first part/layout representation and define supports, coverage, usable interior space, household occupancy and staged work. Detail adding/replacing/removing parts, continuing a dwelling's identity, consumed materials, damage and changes to navigation and protection. Resolve which structural behavior is modeled versus deliberately unsupported, then create a small construction project beneath INV/SW/PO rather than adopting every architectural example.

**October 3 product proposal, revised after game-first critique:** [Editable shelters, rain and home use](../projects/editable-shelters-feature-spec.md) first establishes expressive useful cover, recoverable parts, local moisture/drying and chosen use of a changed place. Its detailed support, renovation and identity cases remain; new wet-tinder restrictions are a separately chosen challenge rather than the minimum feature's justification. [SH limits](../limits/editable-shelters.md) retain scope. Technical design and INV-6.4 delivery remain open.

### ND08 — Material, weather, heat and fire interactions beyond campfires

**Needs scoped design under INV-6.** Sources: [evolvable material properties](../../archive/03-design-proposals/evolving-materials-and-construction.md#properties-state-and-behavior), [heat and fire](../../archive/03-design-proposals/heat-and-fire.md), and [state systems and future influences](../../archive/03-design-proposals/state-systems-and-future-influences.md).

**Existing coverage:** [BW19 campfire care](base-world.md#bw19--camp-fire-care) and [state contributions](state-contributions.md) are delivered foundations; INV-6 retains broader materials, thermal behavior and inactive anticipated influences. The detailed thermal exploration is explicitly not a first-release checklist.

**Needed before an implementation project:** choose a coarse useful model for moisture, exposure, heating, ignition, fuel, local spread and damage. Preserve the source's comparison: the same brief ignition source can ignite a selected dry twig without igniting a substantial wooden wall section; wet/dry conditions are an additional variation. Specify extinguishing, geometry changes, shared material/state ownership, bounded neighborhoods, time integration and dormant dependencies without recursively generating every possible weather system. Coordinate the first shelter consumer with ND07 and applicable background-resolution rules.

**October 5 DG13 refinement:** the existing shelter proposal now includes concrete first materials/layouts, positive use, local exposure/drying proposals and complete failure/reclaim behavior; [SH-L01–SH-L10](../limits/editable-shelters.md) inventory the choices. These inputs do not close the remaining structural, thermal or runtime work.

**Narrow October 3 proposal, revised after game-first critique:** the [shelter specification](../projects/editable-shelters-feature-spec.md) develops vertical rain, persistent moisture and ambient drying. A later authored wet-tinder challenge requires dependable recovery and evidence that it improves play. It is not required for the first useful shelter or the accepted creative MVP. Broader heat, ignition, spread, wind, runoff and damage design remain open; current campfire behavior is unchanged.

### ND09 — Negotiated barter, currency and durable commercial promises inside a world

**Decision before design.** Sources: [economy and negotiation](../../archive/03-design-proposals/world-and-player-experience.md#economy-and-negotiation), D11/R09 and [inventory/trading guidance](../ui-ux/inventory.md).

**Existing coverage:** [PO](persistent-objects.md) and [camp sharing](../projects/camp-fire-and-sharing.md) cover custody and consent-aware one-way handover; [BW17](base-world.md#bw17--readable-promises-and-commitment-management) covers current commitments. The [repertoire foundation](../repertoire-foundation.md) and INV-20.5 already design exact agreement revisions, participant acceptance, amendment/withdrawal, evidence and atomic settlement, with delivery in [INV](inventions-and-world-evolution.md). That architecture does not select a barter family or currency economy. The [UI tracker](ui-ux.md#uiux04) also leaves trading to a separately scoped feature.

**Needed before an implementation project:** select the first reciprocal barter family and player/NPC negotiation journey, mapping its actual items, quantities, offer presentation and fulfillment onto the existing agreement lifecycle. Select whether currency belongs in the first slice; if so, define issuance, sinks, theft/loss and ownership. Choose which deferred delivery, default and dispute consequences that world supports; escrow and interest remain optional. Reuse existing assent/amendment/settlement contracts. Fictional currency is separate from ND22–ND23 real-money accounts.

### ND10 — Persistent groups, shared ownership and in-world institutions

**Conditional scoped design.** Source: [institutions without a mandatory government system](../../archive/03-design-proposals/world-and-player-experience.md#institutions-without-a-mandatory-government-system), with D18's unsettled starting social organization.

**Existing coverage:** conversations, commitments, permissioned containers, actor knowledge and [INV-20 social families](inventions-and-world-evolution.md) have their own contracts or tracked foundations. Account roles and creator privileges already belong to [MP](multiplayer.md). A character calling something a company or government does not create its mechanics.

**Needed before an implementation project:** select one useful group or recurring cooperative arrangement. Specify membership, shared property/goals, delegation, obligations, notices, disputes and dissolution only as that use case requires. Decide whether a formal organization record is needed and which facts each observer knows. Preserve the separation between fictional institutions and platform access/billing authority; do not prescribe a starting government or implement every repertoire institution.

### ND11 — Human conflict/recovery and NPC ghost continuity

**Decision before design under existing lifecycle work.** Sources: [base-world lifecycle and protection](../worlds/base/lifecycle-and-protection.md), D07/D15 and [BW14/BW15](base-world.md).

**Existing coverage:** protected human departure/return and the accepted recoverable-human-death direction remain controlling. BW14 retains combat participation, indirect harm and recovery; BW15 retains NPC ghosts, summoning and ordinary revival. Creator revival is a separate existing power. PS-D01 owns future dangerous-logout integration.

**Delivered bounded human-risk slice:** PG05 implements the owner-selected observational stag encounter, half-type corpse loss and campfire/new-life scars, exact final-blow review and five simulated seconds of vulnerable fade. [Execution](../projects/completed/first-threat-encounter-tech-design.md) and [evidence](../verification/first-threat-encounter.md) define the delivered boundary. This does not complete ND11 or NPC ghost/rescue/ordinary-revival scope. Broader D07/PS-D01 remain unresolved; inactive protection and cooperative PvP are retained.

**Needed before the affected implementation projects:** choose explicit PvP opt-in presentation, any separate incapacitation/execution state, new attributed indirect hazards and broader rescue/return modes. PG05's ordinary one-attack final-blow review, campfire reincarnation/scars and detailed simulated fade are already selected/implemented; do not reopen them implicitly. Separately specify where an NPC ghost exists, what summoning permits, embodiment/duration, retained relationships and a difficult ordinary revival loop. Coordinate property/background protection with PS rather than inventing a blanket building-protection rule or reopening permanent human death.

### ND33 — Food freshness, spoilage and preservation

**Conditional scoped design.** Sources: [food state in the survival proposal](../../archive/03-design-proposals/survival-baseline.md#native-survival-package) and the [current camp-container scope](../projects/parallel-batch-01-playable-week-feature-spec.md#what-it-means-in-this-world), which explicitly excludes food aging and preservation.

**Existing coverage:** [base-world survival](../worlds/base/survival.md), [items](../worlds/base/items.md), [PO](persistent-objects.md) and BW already supply consumption, cooking, exact lots, custody and finite containers. A container currently organizes supplies; it does not keep food fresh. These foundations do not define food condition or a preservation transformation.

**Needed before an implementation project:** select one useful freshness/preservation loop and define per-lot condition, aging clocks, exposure/storage effects, visible or learned spoilage, unknown safety and consumption consequences. Specify actual preservation work, resources and yields, including interrupted work and failed attempts. Preserve condition through splitting, combining, custody changes, saves and background progression; coordinate the selected rules with BW/PO/INV, shared state and simulation-time owners. Detailed nutrition and microbiology are not prerequisites.

## Creation, controls and communication

### ND12 — Cross-world invention libraries and usable pack publishing

**Needs scoped delivery design under existing work.** Sources: [a creator's library across worlds](../../archive/03-design-proposals/invention-governance-and-ownership.md#a-creators-library-across-worlds), [world packs](../../archive/03-design-proposals/invention-governance-and-ownership.md#every-world-has-an-invention-pack), [private-world package policy](../../archive/06-marketing/open-platform-and-private-worlds.md), D36/D43/D44.

**Existing coverage:** [INV-8.1–8.3](inventions-and-world-evolution.md) and [EWF11](extensible-world-foundation.md) already own account libraries, inventories, export/import and rights-aware portability; local attribution exists. Player/world-creator joint ownership of player creations and world-creator ownership of NPC creations are accepted rules. This entry is the missing scoped product journey and cross-service design, not a claim that packs have no architecture or tracker.

**Needed before an implementation project:** define library discovery, retained attribution, authorized cross-world reuse, retention and complete dependency inventories. Resolve private origin metadata, contribution grants, disputed provenance and self-hosted synchronization; specify immutable publication, destination bindings and understandable incompatibility/refusal. Define permitted use/modification/redistribution and what happens when access ends. Start with a bounded local or account-library round trip; a marketplace and ND23 payouts need not block that proof. Preserve current-format integrity and the root development-compatibility policy.

**Scoped product design prepared, 5 October 2026:** [DG12’s library journey](../projects/world-creation-feature-spec.md#15-dg12-expansion--a-useful-invention-follows-its-creator) specifies a same-author local proof and a known-recipient eligible free release, scoped private provenance, retained-copy/reference distinctions, complete dependency checks and failure/update/removal behavior. [WC-L06–WC-L12](../limits/world-creation.md#wc-l06--first-library-and-publication-scope) records the proposed envelope. General contribution terms and cross-operator provenance remain unselected expansions under INV-8.3/D44; technical design and unchecked import/account-library work stay open.

### ND13 — Stable action recommendations and complete control customization

**Needs scoped design for the remaining extension.** Sources: [frequent actions and stable recommendations](../../archive/03-design-proposals/playability-and-controls.md#frequent-actions-and-stable-recommendations), [quick slots, categories and key bindings](../../archive/03-design-proposals/playability-and-controls.md#quick-slots-categories-and-key-bindings), [planned keyboard additions](../../archive/03-design-proposals/world-and-player-experience.md#planned-keyboard-additions), [F57/F58](../../archive/01-requirements/product-baseline.md) and [D46/D47](../../archive/05-project/open-decisions.md#invention-governance-controls-and-workshop).

**Existing coverage:** [current action discovery and preferences](../architecture.md#action-discovery-and-player-preferences) include saved shortcuts and suggestions; AC and UIUX retain action availability and interaction quality. The controls proposal already describes one count per authoritative committed execution, distinct personal/world/global signals and stable open menus. Existing shortcut regression tasks do not complete that ranking or remapping design.

**Needed before an implementation project:** refine the proposed counting and menu-stability rules into a scoped delivery contract: select family markers, grouping across action revisions, windows/weights, treatment of NPC activity and the sharing/privacy contract. Define predictable recommendation changes and user control. Specify remappable actions/categories, conflict handling, accessibility, device/world scope and broken bindings when a capability changes. Scope the later direct-movement and nearby-interaction controls, including destination cancellation, stable target selection and text-focus isolation. Illustrative slot counts and keys remain examples.

**PG03 scoped delivery:** the existing menu now retains opening order while updating availability, preserves search/expanded identity and provides complete permitted discovery plus exact inventory uses. Review preserves the reading window through refresh and includes visible target/tool identity in complete search. This supersedes per-refresh availability sorting in that menu. Pins and their three slots remain stable. [PG03 evidence](../verification/player-clarity-ui.md#pg03--action-discovery-and-commitments--october-3-2026) does not close the broader recommendation signals, revision grouping, arbitrary remapping or platform-specific controls described above.

### ND14 — In-world remote messages and calls

**Decision before design.** Source: [phones and spatial conversation](../../archive/03-design-proposals/world-and-player-experience.md#phones-and-spatial-conversation).

**Existing coverage:** [NC](narration-and-conversations.md) owns durable local conversations and history; MP owns human identity and permissions. Remote communication devices are a later world affordance, not part of the primitive starting inventory or a delivered extension of local hearing.

**Needed before an implementation project:** choose how remote communication becomes available in a world, beginning with contacts/asynchronous text if useful. Define addressing, delivery/read status, availability, blocking, offline retention and who may learn each message. Calls additionally need schedules, missed/interrupted calls and private media delivery coordinated with ND15. A connection must not expose unrelated remote conversations or grant fictional knowledge from account metadata.

### ND15 — Audible NPC dialogue, microphone input and proximity voice

**Decision before feature/technical design.** Sources: [spatial audio and readable conversation](../../archive/02-research/engines-art-and-audio.md#6-spatial-audio-and-readable-conversation), [voice transport and hearing permissions](../../archive/02-research/hosting-and-scale.md#7-voice-transport-and-hearing-permissions), D10/R07.

**Existing coverage:** [HE01–HE05](hearing-and-speech.md) and the [hearing contract](../hearing-and-speech.md) cover acoustic evidence, listener-specific fragments, captions and history; they do not claim an audio-media service. Text-complete play remains the recorded direction. Research options such as LiveKit are not selected providers.

**Needed before an implementation project:** select NPC playback, microphone-to-text, human proximity voice or a bounded combination. Define the relationship between audio, transcripts, committed utterances, interruptions and simulation speed. Media must preserve each listener's permitted words and recognized speaker identity; audience membership alone cannot authorize the full utterance. Specify synthesis/transcription reuse, enforceable audiences, permission denial, mute/revocation/reconnect, media retention, rights, cost and latency. Deliver paired designs and staged work through HE/NC/MP and existing spending owners.

### ND16 — Hearing and communication beyond direct-path speech

**Conditional scoped design.** Sources: [deliberate hearing extension boundaries](../hearing-and-speech.md#12-deliberate-extension-boundaries), [HE deferred expansion](hearing-and-speech.md#deferred-expansion), and [hearing limits](../limits/hearing-and-speech.md).

**Existing coverage:** present hearing, recognition uncertainty and captions are specified. PS04/PS-D02 already own crowd competition, aggregate commotion, stable focus and the timing choice needed for overlapping speech; do not duplicate those tasks here.

**Needed before an implementation project:** select a concrete additional need such as rooms/portals, voice familiarity, language comprehension, amplification or sound-triggered waking. Define propagation or recognition inputs, partial/late listening where relevant, what the listener actually learns, native reactions and saved state. Establish bounded update/query work and meaningful scenarios. Frequency-level acoustics, lip-reading and other listed extensions remain options rather than one required simulation package.

### ND17 — Correcting speech that characters have already perceived

**Decision before design.** Sources: [D66](../../archive/05-project/open-decisions.md#d66--re-authoring-committed-speech), [editing committed speech](../hearing-and-speech.md#editing-committed-speech), [HE deferred expansion](hearing-and-speech.md#deferred-expansion).

**Existing coverage:** generic text edits correctly reject rewriting committed speech; a character may make an ordinary correction as a new speech event. This is not a current hearing defect.

**Needed before an implementation project:** decide whether a dedicated administrative feature creates an attributed correction, invalidates dependent evidence, or explicitly re-authors a fictional timeline. Specify partial listener fragments, recognized identities, summaries and decisions already based on the speech, with clear scope and authority. Do not reconstruct historical hearing from current positions or add old-development-event backfill. Keep implementation with HE and affected memory/data owners.

### ND18 — First-encounter narration for places and inventory items

**Needs a scoped exposure design.** Sources: [selective mechanism delivery](narration-and-conversations.md#selective-mechanism-delivery-within-nc09nc12) and [replaceable story selection](../narration-and-conversations.md#replaceable-story-selection).

**Existing coverage:** actor/object encounter selection is implemented; NC09–NC12 and EPR retain its delivery and qualification. The tracker explicitly leaves places and inventory items needing a future exposure contract.

**Needed before an implementation project:** define a real place identity and what constitutes encountering it, and when carrying, opening or inspecting an item makes it newly available. Specify recognition/detail, custody/container permissions, source text, reentry and duplicate suppression. A small place/item slice should reuse current story selection without inventing an omniscient map narrator or reopening completed actor encounters.

**PG03 scoped delivery:** selected inventory items now expose their existing comparison and supported uses with permitted native facts. Review refuses inaccessible contents before detail projection and retains exact later/accessibly nested lots for offering or fuel use. The second review makes cooking select a fire and explains preparation across carried lots. This helps explain an encountered item without generating narration or defining when a place/item counts as newly encountered. [PG03 evidence](../verification/player-clarity-ui.md#pg03--action-discovery-and-commitments--october-3-2026) therefore contributes to DG01 presentation while the full ND18 exposure/narration design remains open.

### ND34 — Additional distribution platforms and offline play

**Decision before scoped design; conditional expansion.** Sources: [distribution and engine tradeoffs](../../archive/02-research/engines-art-and-audio.md#distribution-and-engine-tradeoffs) and the [client replacement path](../spatial-world.md#client-replacement-path).

**Existing coverage:** the browser/PlayCanvas direction remains selected. [SW10](spatial-world.md#sw10--renderer-boundary-and-mixed-representation) and the client replacement path already describe renderer separation and a migration approach. They explicitly leave native-client UI/input/lifecycle, console delivery and offline simulation outside their delivery scope.

**Needed before a selected platform project:** establish the actual audience or production need, then choose a bounded desktop package, native/console client or offline capability. Define ordinary controller/text interaction, accessibility, accounts, suspend/reconnect, packaging/updates, store integration and platform qualification as applicable. Offline play separately needs a local simulation host or deliberate port and a policy for provider-dependent behavior. Compare one equivalent playable slice and its maintenance cost before committing to a replacement; neither another engine nor a general client SDK is selected here.

## Memory, shared history and advanced authored behavior

### ND19 — Older-memory transformation and dream reinterpretation

**Needs semantic design; explicit future ideas.** Source: [future memory-transformation ideas](../memory-architecture.md#future-memory-transformation-ideas--not-implemented), with D14/D59 and R11.

**Existing coverage:** [CR06/CR09](cognition-redesign.md), the [retention decision ledger](../../archive/07-technical-architecture/data-delivery-and-scale.md#retention-decision-ledger), and source/provenance storage own related foundations. Existing cleanup, consolidation—including the implemented daily mini-model review—and idle reflection do not implement the proposed progressive fuzzing of older recollection or the separate dream-specific reinterpretation.

**Needed before an implementation project:** decide which detail may change or disappear, what important incidents/obligations retain, and how current beliefs can color interpretation without creating false witnessing. Define imagined-versus-factual attribution, lineage, correction/forgetting propagation, cadence, cost and same-version restoration. Treat the proposed weekly/older-period schedule as a candidate, not an enabled default, and set behavioral quality criteria before selecting an algorithm.

### ND20 — A bounded richer-memory retrieval comparison

**Conditional experiment; no new dependency selected.** Source: [Hindsight evaluation](../../archive/02-research/hindsight-memory-evaluation.md), especially its recommendation, integration boundary, matched evaluation and resumption sections.

**Existing coverage:** [CR12/CR13](cognition-redesign.md), R11/R19 and the current [memory architecture](../memory-architecture.md) already own recall, source eligibility, correction, forgetting and quality work. The research explicitly calls for a scoped pilot plan before adoption; its old source findings need reconfirmation against current behavior.

**Needed before a pilot:** establish a consequential repeatable omission, then compare the current implementation, a modest native improvement and optional external retrieval on matched histories. Specify disposable candidate-to-canonical-source mappings, actor isolation, coverage, correction/forgetting/restore, fallback and total latency/cost. Start with an authorized offline investigator if that answers the question. Do not replace canonical memories or promise a Hindsight deployment from this entry.

### ND21 — Mental effects, shared minds and selective telepathy

**Conditional family designs under EWF10.** Sources: [world-module mental-effect and shared-mind boundaries](../../archive/07-technical-architecture/world-module-runtime.md), [EX05/EX06 worked examples](../extensible-world-examples.md), and [EWF10](extensible-world-foundation.md#ewf10--conditional-capability-expansion-review).

**Existing coverage:** engine/world boundaries and agency, cognition, evidence and save owners already define where such behavior must live. A sense registry, a goal field or shared storage does not implement compulsion or a hive mind.

**Needed before a selected feature project:** for one useful mental effect, choose targets, resistance, disclosure, human control policy, conflicting effects, lifetime and interruption. For a shared mind, choose individual/colony control, membership/compartments, source/time attribution, partial connectivity, former-member recollection and resource arbitration. Preserve actual history and target-owned changes; do not concatenate private minds or restore stale whole-goal snapshots on expiry. Route implementation through existing INV/AG/CR/EPR/data owners.

### ND35 — Shared-world restoration and private history

**Decision before design; conditional shared/cloud extension.** Sources: [D60](../../archive/05-project/open-decisions.md#d60--gameplay-save-and-load-policy) and [external work, privacy and shared authority](../save-and-load.md#external-work-privacy-and-shared-authority), including the remaining D48 private-channel choices.

**Existing coverage:** [SL10](save-and-load.md#sl10--conditional-portability-and-shared-world-expansion) already owns portability and shared-world expansion. Save/load roles, coherent restoration, current forgetting protections and non-rewindable permissions/accounting are specified; [PD06](production-deployment.md) owns hosted backup/disaster recovery. This entry concerns the unresolved shared gameplay and private-history treatment, separately from operational recovery, invention-pack portability and personal journal export.

**Needed before the selected extension ships:** define participant notice, pending commands, reconnect and how a discarded future is presented. Decide whether private-channel history stays current or participates in a protected rewind, including dependent narration and erasure. Specify authorized exports without plaintext disclosure to creators, current-grant/accounting reconciliation, and whether branching or cross-world effects are supported. Reuse SL10 and the existing privacy/data owners. These choices do not reopen settled save permissions or authorize legacy-save support.

### ND36 — Optional narrative perspectives and distant-event cutaways

**Selected external product proposal; optional narration mode.** Sources: [D57](../../archive/05-project/open-decisions.md#d57--narration-composed-responses-and-durable-conversations), [external events and awareness](../narration-and-conversations.md#5-external-world-events-and-awareness), and [Narrator context assembly](../narration-and-conversations.md#8-the-narrator-and-context-assembly).

**Existing coverage:** [NC07–NC12](narration-and-conversations.md) already own private Narrator storage, scoped generation, journal delivery and qualification. The [current delivery boundary](narration-and-conversations.md#remaining-delivery-within-nc01nc12) explicitly leaves cutaways and private-NPC-thought modes disabled. Ordinary actor-perspective stories and ND18 encounter extensions do not require these modes.

**Needed before enabling a mode:** select the useful perspective, who may receive distant events or an NPC's private thoughts, and which source details may be disclosed. Define spoilers, cross-player fairness, preferences, revocation/retention, and bounded triggering/cost. Keep what a human sees in a story separate from what their character actually knows; retention or narrative importance alone grants no disclosure. Deliver the selected mode through existing NC execution and permission owners.

**October 5 DG15 scope:** the [researched product specification](../projects/story-perspectives-feature-spec.md) now selects that permission for one external familiar activity in a single-human private world, with [SP01–SP08](../limits/narration.md#sp01--selected-external-perspective) and [NC20](narration-and-conversations.md#nc20--optional-after-you-left-perspective). The source policy is a new proposed consumer, not inherited omniscience. Private internal stimuli, other-human information and broader cutaways still require separate selection; implementation and qualification remain open.

## Commercial service, creator ecosystem and launch learning

### ND22 — Commercial offers and the customer entitlement lifecycle

**Decision before detailed commerce design; accepted commercial direction.** Sources: [subscription tiers and invention allowances](../../archive/06-marketing/business-plan.md#player-subscription-tiers-and-invention-allowances), [creator economy](../../archive/06-marketing/creator-economy-and-mechanics-packs.md), [billing/entitlement contracts](../../archive/07-technical-architecture/billing-and-usage-reporting.md), and optional [additional character slots](../../archive/04-ideation/business-and-future-directions.md#monetization-candidates); D17/D35.

**Existing coverage:** the billing design already covers account/period quota records, cross-world reservations and uncertain completion. INV-13 covers cost/entitlement integration; [PD10](production-deployment.md) already gates payments. PS-D06 retains quiet-world funding choices. These are not missing basic accounting designs.

**Needed before an implementation project:** select launch offers and overlapping world/platform benefits; settle chargeable invention counting, revisions/bundles, renewals, rollover, plan changes, cancellation/refunds and any top-ups. Define payment fulfillment/reconciliation and customer behavior when allowance or funding ends. Keep access, invention units, real AI cost and optional art funding distinct. No example price, monthly quantity or overage policy becomes accepted here.

If an offer includes additional character slots, define switching, unattended behavior and compute funding. Simultaneous character control within the same world first needs the [RP05 embodiment-policy decision](revisitable-policies.md#rp05--prototype-account-and-native-work-operating-envelopes); extra slots do not implicitly change that policy.

### ND23 — Creator revenue allocation and marketplace operation

**Decision before financial-system design.** Sources: [creator economy and mechanics packs](../../archive/06-marketing/creator-economy-and-mechanics-packs.md), [private-world package policy](../../archive/06-marketing/open-platform-and-private-worlds.md), D35/D36/D43/D44.

**Existing coverage:** ND12 points to INV-8/EWF11 for technical library/pack portability; [PD10](production-deployment.md) recognizes marketplace payout gates. A valid exported pack does not settle commercial rights or payment operations.

**Needed before an implementation project:** choose qualifying participation, the subscriber allocation formula, premium-world overlap, fees, payout eligibility, fraud/refund handling and financial reconciliation. Set use/modification/redistribution terms and continuing access after cancellation in coordination with rights-aware publication. The [well-being funding alternatives](../../archive/08-wellbeing-vision/13-money-and-mission.md) are proposals, not a replacement for accepted membership direction; illustrative allocations are not prices or payout commitments.

### ND24 — Patron recognition, dedications and durable attribution

**Needs product terms and lifecycle design.** Source: [patrons, contributors and world history](../../archive/06-marketing/patrons-contributors-and-world-history.md), especially benefits, engravings/permanence and ownership transfer; D37.

**Existing coverage:** ordinary entitlement and payment foundations can be reused. Neither ordinary item ownership nor invention attribution settles one-time naming rights, historical supporter recognition or a promise of permanence.

**Needed before an implementation project:** distinguish recurring benefits, one-time redemption, the physical object, historical dedication and original supporter. Define retry/restore-safe fulfillment, later transfers, name review/corrections, privacy consent and service/world retirement or export. Specify exactly what any permanence promise means. A transferred object must not silently renew a consumed dedication or rewrite original attribution; this work does not require tokens or NFTs.

### ND25 — Creator grants and contributor/patron governance

**Decision and operating-program design first.** Sources: [contributor voice and creator fund](../../archive/06-marketing/patrons-contributors-and-world-history.md), [money and mission proposals](../../archive/08-wellbeing-vision/13-money-and-mission.md); D37.

**Existing coverage:** subscriber allocation, marketplace purchases and platform authority have separate owners. The proposed creator fund and advisory/voting rights are not defined by those mechanisms.

**Needed before implementation:** choose a sustainable fund budget, applicant/contributor eligibility, deliverables, rights, milestones and payout evidence. Specify advisory versus binding decisions, patron/contributor influence, overlapping membership, conflicts and abuse handling. Decide whether any proposed creator standard is wanted. Start with an understandable operating process; build grant or voting software only when that process needs it. Mission locks and corporate structures remain optional decisions, not engine prerequisites.

### ND26 — A bounded commercial test and repeatable product demonstration

**Needs an experiment brief.** Sources: [business launch and validation plan](../../archive/06-marketing/business-plan.md), [channels and experiments](../../archive/06-marketing/ideas-channels-and-experiments.md), and [positioning/demo concepts](../../archive/06-marketing/positioning-and-copy.md).

**Existing coverage:** draft copy, channel ideas and a business plan exist. PD01/PD09 own launch configuration and hosted qualification; they do not establish demand, willingness to pay or a sustainable support burden.

**Needed before executing an experiment:** select the first audience and supported playable/creator loop, an actual budget and owner, review date, measures and stop/expand criteria. Design an honest repeatable demonstration of creation, refinement and reuse. Measure comprehension, first successful creation, return/renewal, costs and support. Do not make pack portability a prerequisite for a managed-hosting test when the business plan permits earlier learning. Outreach, publishing and ad spending require their own authorization.

### ND37 — Public-world reporting, participation controls and operator authority

**Decision before scoped service design.** Sources: D21 in [open decisions](../../archive/05-project/open-decisions.md) and the [human-private content boundary](../../archive/07-technical-architecture/data-queries-and-mcp.md#human-private-content-boundary), which retains D48's separately authorized operational-inspection and abuse-handling policy.

**Existing coverage:** [PD08/PD10](production-deployment.md) already name support, reporting, mute/block/ban tools, audited operator access and release gates; [MP](multiplayer.md) and data owners supply accounts, invitations, grants and private projections. These foundations do not settle participant policy or the permitted evidence for enforcement. This service work is separate from fictional institutions in ND10 and does not depend on adopting the optional well-being proposals in ND27.

**Needed before the affected public-world project:** select the first reporting and enforcement journey, scope/duration of participant controls, creator versus separately authorized operator powers, and private-evidence access/retention. Define outcome communication, review of mistakes, revocation/reconnect behavior and a bounded delivery plan under PD/MP/data owners. Creator status must not supply access to human-private content. Adding this entry selects no moderation policy or new operator permission.

## Optional well-being and real-world value

The [well-being vision](../../archive/08-wellbeing-vision/README.md) explicitly remains open ideation. The entries below preserve promising clusters for selection; they do not adopt its proposed charter, release gates, age policy, intervention rules or numerical targets. Individual rituals, story examples and world concepts remain in that source library.

### ND27 — Resident conduct, audience and sensitive-conversation policy

**Decision before design; open ideation.** Sources: [residents who point outward](../../archive/08-wellbeing-vision/04-ideas-residents-who-point-outward.md), [guardrails, risks and law](../../archive/08-wellbeing-vision/11-guardrails-risks-and-law.md), [first questions and experiments](../../archive/08-wellbeing-vision/14-questions-and-first-experiments.md); D16/D21.

**Existing coverage:** NC/CR own conversation, authorized memory inspection and correction/forgetting; PD07 owns model/prompt policies, and PD10 retains audience/territory launch work. ND37 preserves general public-service enforcement independently. These owners do not imply adoption of the proposed resident code or all claims in dated legal research.

**Needed before an implementation project:** decide which standards apply to official service behavior versus authored fiction; choose audience/age scope, real-life conversation boundaries, human/AI disclosure, farewells, emotional-dependency and commercial-message policy. Define any crisis experience, operator role, privacy and meaningful evaluation. Create a scoped behavior and technical design only for the adopted policy; do not silently import the archive's proposed audit thresholds or romance rules.

If [player-facing resident-memory controls](../../archive/08-wellbeing-vision/04-ideas-residents-who-point-outward.md#4-the-memory-ledger) are selected, define what a player may inspect, correct or ask to have forgotten, including shared conversations and other people's private information; reuse existing memory authority and correction/forgetting. Decide what [resident continuity across model/prompt changes](../../archive/08-wellbeing-vision/04-ideas-residents-who-point-outward.md#6-identity-that-holds) should preserve and what evidence would qualify it.

### ND28 — Optional session endings, play rhythms and returning experience

**Conditional product experiment.** Sources: [rhythm, rest and return](../../archive/08-wellbeing-vision/03-ideas-rhythm-rest-and-return.md), [top picks](../../archive/08-wellbeing-vision/00-top-picks.md), and E2/E3/E5 in [first experiments](../../archive/08-wellbeing-vision/14-questions-and-first-experiments.md).

**Existing coverage:** NC supplies narration/journal foundations; MP handles current absence, and PS05/PS-D01/PS-D03 own future protection and clock integration. Older suggestions that the world waits or nothing decays during absence do not override the continuing-world direction.

**Needed before a pilot:** choose one optional closing/return experience, such as a skippable journal reflection. Define player control, opt-out, personal bedtime/session preferences, notification/digest behavior and the measure of usefulness. Separate personal presentation from other participants' continuing simulation. A friendly ending need not become a new global pause rule or an unwanted behavioral intervention.

### ND29 — Measure whether play supports well-being and human connection

**Conditional research and measurement design.** Sources: [measuring what matters](../../archive/08-wellbeing-vision/12-measuring-what-matters.md), Q1/Q11 and E6 in [questions and first experiments](../../archive/08-wellbeing-vision/14-questions-and-first-experiments.md).

**Existing coverage:** operational performance, costs and ordinary gameplay evidence already have owners. This proposed research program is not an adopted analytics specification.

**Scoped product design:** [DG11’s connection-study proposal](../projects/wellbeing-evidence-feature-spec.md) now defines one possible study’s full participant behavior and interpretation. [WBE tasks](wellbeing-evidence.md) retain technical, operational and empirical work. The proposal does not resolve or adopt the archive’s broader Q1/Q11 programme.

**Needed before collecting data:** choose the actual question and whether it is a product objective; define opt-in consent, sampling, minimal data, retention and separation from identity/private conversation. Set comparison and interpretation methods, including self-report/selection limitations, and decide whether research partners or public reporting are wanted. Design the smallest instrumentation for that study. Do not turn proposed scales into player scores or claim health benefits from engagement metrics.

### ND30 — Personal journal extensions and exported or printed editions

**Conditional product design.** Sources: the Legenda concept in [top picks](../../archive/08-wellbeing-vision/00-top-picks.md), [self-knowledge and meaning](../../archive/08-wellbeing-vision/07-ideas-growth-and-real-goals.md), and [privacy proposals](../../archive/08-wellbeing-vision/11-guardrails-risks-and-law.md).

**Existing coverage:** NC07–NC12 already own private Narrator storage, grounded generation, Journal UI and qualification. This entry is not a task to build that foundation again.

**Needed before an implementation project:** decide whether real-life anchors/reflections belong in the product, who may use them, and their edit/delete/forget behavior. Define permitted sources for a private PDF/print edition, art rights, corrections and shared/family editions requiring other participants' consent. First test whether a narrow export is valuable. A journal export does not authorize full-world/private-history export or a different service-sunset policy.

### ND31 — Human introductions, small groups and family participation

**Conditional product pilot.** Sources: [residents as connectors and human participation](../../archive/08-wellbeing-vision/04-ideas-residents-who-point-outward.md), [ideas together](../../archive/08-wellbeing-vision/05-ideas-together.md), and E10 in [first experiments](../../archive/08-wellbeing-vision/14-questions-and-first-experiments.md).

**Existing coverage:** multiplayer human characters and invitations exist; D68 retains entry expansion, and PD retains public-operation gates. These are additional social journeys, not missing foundational multiplayer.

**Needed before a pilot:** choose one use case—mutually accepted introductions, a recurring small group, or two-person family participation. Define discoverability/contact consent, what residents may disclose, human attribution and handoff, scheduling, opt-out and moderation. Real-world venues additionally need a selected partner/process and an accessible remote alternative. Do not turn every civic gathering or family-world example into a committed platform feature.

### ND32 — Learning, creation and other uses beyond the game

**Conditional discovery and experiment.** Sources: [value beyond entertainment](../../archive/04-ideation/business-and-future-directions.md#value-beyond-entertainment), [hands, body and nature](../../archive/08-wellbeing-vision/06-ideas-hands-body-and-nature.md), [growth and real goals](../../archive/08-wellbeing-vision/07-ideas-growth-and-real-goals.md), [D25](../../archive/05-project/open-decisions.md) and [R16](../../archive/05-project/research-backlog.md).

**Existing coverage:** invention, knowledge and bounded teaching have their own implementation owners. Those mechanisms do not prove real-world learning, useful rehearsal or demand for another product.

**Needed before a feature project:** identify one actual user problem and test a small craft, communication rehearsal, learning exercise or language experience. Define feedback/debrief, evidence of transfer, content/partner permissions, accessibility and physical-world responsibilities where relevant. Decide whether it belongs in the game, a creator world or a separate offer. Broader education, training and clinician-partnered uses remain hypotheses until this work supports them.

The same ideation proposes writer-facing scene creation, reproducible agent-evaluation scenarios and reusable developer tools. Under D25/R16, select a real user and repeated problem before a separate offer. Test one useful scene outline, one controlled scenario with trustworthy outcome scoring, or one external module integration; define source/rights handling, evaluation and the actual delivery/support boundary. Existing game tests and internal packages do not establish external demand or require a general SDK.

## Existing designs and deliberate deferrals to reuse

The following material was checked to avoid treating an old proposal, an archive path or unfinished implementation as evidence that design is missing.

| Area                                                 | Existing design and work home                                                                                                                                                                                                                                                         | Disposition for this register                                                                                                                                                                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Art creation and progressive appearances             | [Accepted runtime art target](../invention-art-pipeline.md); [3D pixel-art feature spec](../projects/3d-pixel-art-feature-spec.md), [technical design](../projects/3d-pixel-art-tech-design.md) and asset/family/validation companions; [V3D01–V3D12](3d-pixel-art.md), INV-12/INV-14 | Has a proposed design and staged delivery plan. Style/provider/rights, useful-asset cost, human review and device decisions remain with those gates. The mercenary pilot exists; the broader hybrid pipeline remains proposed. Do not restart it as an undesigned art project. |
| Art studies and production choices                   | [Art-direction progress](art-direction.md), [creative brief](../../art-direction/final-board/creative-brief.md), V3D01/V3D12                                                                                                                                                          | Broader production qualification remains open. Older R01/R02 language saying no study exists is not the current status of the mercenary pilot. Reference art is not proof of production rights.                                                                                |
| Elapsed simulation and locality                      | [Simulation-time tracker](simulation-time.md), [boundary catalogue](simulation-boundaries.md), [proportional-step-work plan](../projects/proportional-step-work.md), PF/EPR/SW                                                                                                        | Existing design, family contracts and remaining work; do not create a second scheduler backlog. Product-resolution semantics remain with PS.                                                                                                                                   |
| Hosting, authentication and regional infrastructure  | [Production-deployment specs and PD01–PD12](production-deployment.md), [Auth0 plan](../projects/auth0-sign-in.md), [production-data D5/D6](production-data.md), [MP](multiplayer.md)                                                                                                  | Already planned, with implementation/hosted qualification still distinct. Older hosting/auth candidates do not reopen selected plans. ND02 supplies player allocation choices; ND22–ND23 supply commerce decisions; ND37 preserves public-world enforcement policy.            |
| Persistence, scoped queries and replication          | [Technical architecture index](../../archive/07-technical-architecture/README.md), [data tracker](production-data.md), [save/load](save-and-load.md), PF/PD                                                                                                                           | Much of archive/07 remains a canonical technical design owner. Current PostgreSQL and scoped HTTP/SSE supersede old SQLite/transport suggestions. Existing optimization and PD06 recovery gates remain; ND35 preserves unresolved shared gameplay/private-history choices.     |
| Agency, investigation and teaching                   | [AG](agent-agency.md), [CR and CH01–CH03](cognition-redesign.md), INV-4/INV-7, [next-priority batch](parallel-batch-02-foundations-and-usability.md)                                                                                                                                  | Existing persistent pursuits, bounded tool use and qualification are tracked. ND04 concerns progression rules, not a replacement planner; ND32 concerns evidence of real-world value.                                                                                          |
| Conversation memory                                  | [Compaction feature spec](../projects/conversation-compaction-feature-spec.md), [technical design](../projects/conversation-compaction-tech-design.md), [NC14–NC18](narration-and-conversations.md)                                                                                   | Rolling compaction is implemented; NC12 retains broader qualification and NC18 already owns conditional richer-state/segmented/retrieval studies. Do not duplicate NC18.                                                                                                       |
| Action experience, current survival and shared state | [AE](action-experience.md), [BW](base-world.md), [SC](state-contributions.md), [DI](dependency-invalidation.md), [playable-week](parallel-batch-01-playable-week.md) and [priority-batch](parallel-batch-02-foundations-and-usability.md) projects                                    | Detailed designs and substantial delivery already exist. Keep remaining acceptance, material-crafting, camp-supply and reply-preview assignments with those owners. Broad historical "not implemented" descriptions do not reset them.                                         |
| Family inspection and promise controls               | [BW16 family authoring/inspection](base-world.md#bw16--family-authoring-and-inspection), [BW17 promise management](base-world.md#bw17--readable-promises-and-commitment-management), [D63/D64](../../archive/05-project/open-decisions.md#social-exposure-decisions)                  | BW16 family-tree authoring is delivered with creator-only objective inspection and existing memory-based learning. Remaining promise changes retain BW17/D64; broader family vocabulary needs a named extension rather than reopening independent sibling facts.               |
| Macrofold and AI execution                           | [Current provider contract](../ai-providers.md), [MW](macrofold-worker-api.md), [World Agent work](world-agent-writes.md), R19/R20                                                                                                                                                    | Caller migration and scoped authoring have existing implementation and qualification records. Comparative executor/resource-hosting ideas remain bounded platform research, not new OpenLegend prerequisites.                                                                  |
| Generated executable algorithms                      | [INV-8.4](inventions-and-world-evolution.md), [EWF10](extensible-world-foundation.md#ewf10--conditional-capability-expansion-review), D20/R05                                                                                                                                         | Keep conditional on a real mechanic that supported declarative composition cannot express. The existing owner must select the consumer and scoped isolation design; no generic sandbox project is added.                                                                       |
| Secondary world/scale strategies                     | [Product-scalability alternatives](../product-scalability/alternatives.md)                                                                                                                                                                                                            | Seamless geography, time dilation, isolated rollback, chapter worlds and reenactments have reconsideration triggers. They are not automatically scheduled features.                                                                                                            |
| Tokens, investment and corporate mission structures  | D38, [funding exploration](../../archive/06-marketing/tokens-and-community-funding.md), [money and mission](../../archive/08-wellbeing-vision/13-money-and-mission.md)                                                                                                                | Preserve as unselected product/governance questions. No chain, token financing, mission lock, unrestricted export or service-retirement promise is adopted; ND24–ND25 can proceed with ordinary entitlement/program choices.                                                   |

## Review coverage and source interpretation

This review checked the original source notes and follow-ups against newer owners; the product-scalability suite and its project/decision/work owners; relevant current feature documents, project plans, maintainer trackers and [implementation status](../../archive/05-project/implementation-status.md); art direction and pipeline plans; the product baseline; design proposals; technical research and architecture; project decisions/roadmap; business/marketing ideation; and the well-being vision's main proposals, guardrails, measurement and experiment sections. An independent second pass rechecked completeness and design status across these areas. Long contracts and research collections were inspected selectively through their topic owners and relevant sections. This is a source-to-design reconciliation, not new runtime or capacity verification.

The game-inspiration library and game dossiers, worldbuilding research library, and individual repertoires were deliberately excluded. Their workstream remains separate. The well-being evidence library was not exhaustively reread, and individual rituals/examples were grouped rather than converted into hundreds of tasks.

Prefer current canonical owners and concrete project/tracker evidence over old blanket status statements. Examples found during this pass include earlier inactive-world pause assumptions versus the newer continuing-world direction; earlier timing/camera descriptions versus current owners; and old "no art study" or pre-foundation implementation claims. Those sources were left in place. The register preserves the useful future intent without adopting superseded behavior or undertaking unrelated documentation cleanup.

The [root development-save policy](../../AGENTS.md#development-save-policy), current privacy/authority boundaries, and existing acceptance requirements remain controlling. Future portability, live-definition changes, retention or service promises must be designed within those constraints; an entry here does not change them.
