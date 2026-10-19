# Future work needing design

This register identifies remaining product decisions and design preparation. Existing feature/technical specifications own behavior and mechanism; focused maintainer trackers own implementation and qualification. **ND01–ND38** identify needs and **DG01–DG36** group related preparation. Neither numbering nor inclusion establishes implementation priority or authorizes an unselected feature.

## First-playable preparation and current selected scope

The [first-playable world specification](../worlds/base/playable-openings.md#first-playable-game-target) owns the required survival, defensible camp, differentiated cast, cooperation, invention and independent-conflict experience. The [integrated feature specification](../projects/first-playable-world-feature-spec.md) and [technical design](../projects/first-playable-world-tech-design.md) complete the selected design and implementation breakdown. [FPV01–FPV09](first-playable-validation.md) coordinates actual-build readiness, integration and player evidence. [Gameplay priorities](../repertoires/gameplay-priorities.md) governs selection.

**Selected first-playable design: Done — designed; implementation and acceptance open.** [SV01–SV10](first-playable-survival.md) owns empty-handed survival, known manufacture, useful invention and recovery; [SH07–SH12](editable-shelters.md#sh07--natural-material-roles-and-selected-world-definitions) owns the natural camp, real barriers/entrance and damage/recovery; [CP01–CP10](first-playable-cooperation.md) owns four differentiated people and voluntary cooperation; [RW01–RW06](first-playable-roaming.md) owns finite wildlife and independently chosen human travel/discovery. These settle the selected ND06/ND07/ND10/ND11/ND26 and DG02/DG03/DG06/DG13 portions without closing broader ecology, institutions, personality transformation, afterlife, commercial execution or player evidence. Test useful partial activities without reducing the whole target.

Adult players, non-explicit presentation with optional sex, and browser-only delivery are selected. They are not unanswered inputs. Measured tuning qualification, service terms, technical delivery and enabled-feature qualification remain with their respective owners. [The playtest plan](../projects/first-playable-playtest-plan.md) supplies DG03/ND26 operations; [the offer decision brief](../projects/initial-commercial-offer-decision-brief.md) supplies CO01's browser-feasible comparison.

**Accepted speech/social-perception and shared-text designs:** The selected ordinary speech, recognition and structured-experience design is specified in [the feature specification](../projects/speech-and-social-perception-feature-spec.md) and [technical design](../projects/speech-and-social-perception-tech-design.md), with implementation under [SPK](speech-and-social-perception.md). The [shared NPC streaming pair](../projects/npc-speech-streaming-feature-spec.md) also completes the immediate public-text design, with [NST](npc-speech-streaming.md) owning its implementation. These bring concrete ND16 slices forward before DG26 media; DG02/CE and DG18 consume them. They do not close the ND16 umbrella, DG02, ND19/DG23, conditional ND20/DG04 or optional ND14–ND15/DG24–DG26. Current runtime is unchanged by this documentation.

**Selected combat design: complete.** The [combat-response feature specification](../projects/combat-and-threat-responses-feature-spec.md) and [technical design](../projects/combat-and-threat-responses-tech-design.md) complete the selected ND11 direct-PvP/projectile/immediate-response slice and ND13 combat-sensitive Command-click slice. Their disposition is **Done — designed; implementation and acceptance open under CTR01–CTR10**. This is not completion of either whole ND entry, broader ecology, relationship change, rescue, ghost continuity or control customization.

## How to use and maintain this register

Use the [maintainer index](README.md) for delivery, [open decisions](../../archive/05-project/open-decisions.md) for consequential choices, [research backlog](../../archive/05-project/research-backlog.md) for empirical questions and [policies to revisit](revisitable-policies.md) for reconsideration triggers.

For selected work, check the actual available revision and relevant owner evidence. Define a useful outcome, meaningful failures, necessary dependencies and remaining decisions. Follow the [design workflow](../../.agents/skills/openlegend-design/SKILL.md) and [feature-documentation structure](../feature-documentation.md): use existing paired specifications, focused tasks and limits inventories where adequate. World-specific rules remain world-owned.

Close missing preparation when an adequate design and delivery breakdown exist, or an explicit decision rejects/supersedes the extension. Preserve the stable ND identifier and route to its owner. Unfinished implementation or player evidence does not by itself reopen completed design. Add a new design need only when no existing owner covers it.

## Current design dispositions

Read each ND entry's selected scope separately from its possible expansions:

| Disposition               | Meaning                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Selected design complete  | Reuse the named design; delivery and acceptance may still be open.                                                        |
| Product proposal prepared | Reuse the proposed behavior; resolve remaining adoption and technical/operational design before dependent implementation. |
| Needs scoped design       | A wanted extension still needs its concrete product/technical contract.                                                   |
| Decision required         | Finish independent investigation, then resolve the named consequential choice before settling dependent design.           |
| Conditional               | Start only for a selected use case or demonstrated problem; an experiment is not always necessary.                        |

The supported opening, static discovery, immediate barter, paired outing, open shelter and sling-competence designs have existing owners. Their narrower evidence does not establish the whole first playable. Use their trackers for actual integration and remaining qualification rather than infer availability from a summary here.

## Ordered design groups

Groups organize decisions and dependencies, not a release queue, staffing plan or requirement to finish one band before starting another. Select actual next work using [gameplay priorities](../repertoires/gameplay-priorities.md), [repertoire coverage](../repertoires/coverage.md), implementation gaps and the [prioritization workflow](../../.agents/skills/openlegend-prioritize/SKILL.md).

### Reuse the five existing product proposals

| Existing proposal                                                                | Design groups                                          |
| -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [Continuing NPC lives](../projects/continuing-lives-feature-spec.md)             | DG02, DG17                                             |
| [Attention, crowds and scenes](../projects/attention-and-scenes-feature-spec.md) | DG02, DG18, DG26                                       |
| [World creation](../projects/world-creation-feature-spec.md)                     | DG12; DG17 for larger continuing-community assumptions |
| [Editable shelters and rain](../projects/editable-shelters-feature-spec.md)      | DG13; DG20 for broader thermal effects                 |
| [Authored stats and checks](../projects/authored-stats-feature-spec.md)          | DG14                                                   |

### Order and parallel opportunities

| Band                      | Groups    | Dependency boundary                                                                                                                                                                    |
| ------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Personal game             | DG01–DG05 | Actions, characters and player-learning preparation can progress together; recall and session rituals are conditional.                                                                 |
| Shared play               | DG06–DG11 | Exchange/cooperation and conflict preparation can progress together. Public entry consumes applicable human-protection and admission decisions; social/study programs remain optional. |
| Creation and expression   | DG12–DG16 | Creation, construction and competence have distinct owners. Required first-camp construction is early work; optional perspectives/exports are not gates.                               |
| Continuing communities    | DG17–DG25 | Attended slices can use current contracts. New absence/clocks/funding rules must be settled before a dependent continuing-world offer.                                                 |
| Spoken communication      | DG26      | Coordinate shared media/hearing meaning, then deliver independently useful stages. Text remains complete.                                                                              |
| Service and participation | DG27–DG30 | Offers and visits can proceed independently with their actual inputs. Marketplace and fund programs have separate rights/operating decisions.                                          |
| Deeper society            | DG31–DG34 | Select biology, institutions, extraordinary minds and campaigns independently; consume only actual shared dependencies.                                                                |
| Conditional expansion     | DG35–DG36 | Additional platforms or beyond-game uses start at a selected need, not automatically after other bands.                                                                                |

### Band 1 — Improve the current personal game

#### DG01 — Actions and first encounters

ND13's combat-sensitive Command-click extension is designed under [CTR02/CTR09/CTR10](combat-and-threat-responses.md); implementation and acceptance remain open. Recommendation counting, remapping and other nearby controls still need scoped extension design. **ND38** separately asks whether human skill during an already selected action should affect execution quality; do not fold that question into shortcut ranking or the current CTR design. Reuse PG03's readable/stable action discovery, PX03's static place/item discovery and the investigation's evidence comparison; their broader qualification stays in their trackers. Another discovery or input family needs a selected benefit and failure cases.

**Owners/dependencies:** AC/UIUX, NC/EPR and PO; [PG03](parallel-batch-03-personal-game.md), [PX03](parallel-batch-04-expeditions-and-exchange.md), [player-clarity evidence](../verification/player-clarity-ui.md) and [discovery evidence](../verification/useful-discoveries.md). Present actual permitted knowledge/actions. Device-specific expansion belongs to DG35.

#### DG02 — One resident who follows through

**Selected dependency:** [SPK](speech-and-social-perception.md) supplies ordinary addressed/ambient speech, reliable recognition and full structured personal evidence without compulsory social membership or reply. This repairs a specific input/interaction design and does not complete CE03/CE05, D69 or broader DG02 character quality.

**Selected immediate-conflict slice, October 17 — Done: designed.** [CTR05–CTR08/CTR10](combat-and-threat-responses.md) defines complete busy-context choices, interpreted threat appraisals, required relevance then voluntary choice, meaningful withdrawal/pursuit triggers and strict independent Ada counterattack acceptance. Reuse the [feature/technical pair](../projects/combat-and-threat-responses-feature-spec.md) and CE/AG/CR owners. This does not qualify her ordinary day, broader personality change, relationships or autonomous combat behavior before runtime evidence.

[Compelling characters](../projects/compelling-characters-feature-spec.md) and its [technical design](../projects/compelling-characters-tech-design.md) own bodily and psychological experience, identity, attention, memory, independent interests, contact, belonging and chosen solitude. Qualify complete episodes, interruption/resumption and later consequences; a successful meal or varied activity list is insufficient.

Reuse bounded PG02 and [investigation](parallel-batch-08-the-missing-belonging.md) evidence. The selected [people/cooperation pair](../projects/first-playable-cooperation-feature-spec.md) and [authored four-person cast](../worlds/base/first-playable-people.md) are **Done — designed** under CP01–CP10, through existing CE/ACT/AG/CR owners. [CE04–CE05](character-experience.md) retains actual independent life, human reading/model delays and self-care acceptance. The selected survival pacing and wider social-offer window address concrete burdens through their world owners; neither documented tuning nor more pantry stock establishes an enjoyable pace.

**Owners/dependencies:** [CE](character-experience.md), AG12/CR12, ACT/BW, EPR/HE/NC and PS. New clock/absence rules consume DG17/PS05. Crowds are DG18/DG26; longer-term personality transformation is DG23, not a prerequisite for compelling initial people.

#### DG03 — A useful demo and early audience learning

**Selected first-playable design and test preparation: Done — designed.** The [integrated world pair](../projects/first-playable-world-feature-spec.md) and its linked SV/SH/CP/RW owners settle the game's required mechanics, content and implementation dependencies. [The playtest plan](../projects/first-playable-playtest-plan.md) and [FPV](first-playable-validation.md) own ND26's build selection, readiness, recruitment, observation and improvement. Reuse these owners; their existence does not qualify a build, execute recruitment or establish enjoyment.

**Owners/dependencies:** FPV and applicable production/launch owners. Prepare while selected game work proceeds; qualify what a session actually offers. Separate usability, enjoyment/voluntary return, broader demand and payment. Investigate [CO01 offers](../projects/initial-commercial-offer-decision-brief.md) in parallel; billing, portability and a marketplace are not prerequisites for ordinary player learning.

#### DG04 — A specific recall problem

Conditional ND20: establish a consequential repeatable omission, then compare current recall, a modest native improvement and optional richer retrieval on matched histories. Include source eligibility, correction/forgetting, isolation, restore, latency and cost; stop if the current approach is adequate.

**Owners/dependencies:** CR12/CR13, R11/R19 and memory owners. No canonical-memory replacement or external dependency is selected. This can run beside a relevant gameplay need without DG23 transformations.

#### DG05 — Ending and returning to a session

Conditional ND28: select one useful skippable closing/return experience, personal preferences and any wanted notifications. Evaluate whether it helps people leave and resume an activity they care about.

**Owners/dependencies:** NC/MP and current absence behavior; PS only for an actual absence-rule change. No shared-world pause, journal-export business or well-being study is required.

### Band 2 — Make shared play worth joining

#### DG06 — Reciprocal exchange and small cooperation

Reuse [PX02 exact barter and PX04 voluntary outings](parallel-batch-04-expeditions-and-exchange.md), the [social contract](../worlds/base/social.md), [barter evidence](../verification/reciprocal-barter.md) and [outing evidence](../verification/voluntary-outings.md). Their selected immediate exchange/paired-travel behavior does not establish persistent institutions or general obligations.

**Selected first-playable cooperation: Done — designed.** The [feature specification](../projects/first-playable-cooperation-feature-spec.md), [technical design](../projects/first-playable-cooperation-tech-design.md) and [CP01–CP10](first-playable-cooperation.md) settle four authored people, finite help/guidance/hunts, actual sharing/trade, revocable alliance/ceasefire, exact amendment/withdrawal and personal knowledge of results. Existing outings, custody, goals and native activity owners supply execution; an accepted request grants no remote control or shared ownership. Implementation and independent willingness/useful aid remain open.

**Owners/dependencies:** INV-20, PO, BW17 and social/AG/CE owners. Currency and government are unnecessary. Durable agreements and wider institutions remain DG22/DG32; the required camp has its own construction owner.

#### DG07 — Human participation and recoverable conflict

**October 17 selected direct-conflict slice — Done: designed.** Mike permits direct human PvP in this world without separate mode, area or duel enrollment and requires actual bodily projectile collateral. The [combat-response feature specification](../projects/combat-and-threat-responses-feature-spec.md) and [technical design](../projects/combat-and-threat-responses-tech-design.md) define admission, release review, personal threat responses and exact implementation gates under CTR01–CTR08/CTR10. Existing player recovery, vulnerable fade and fully inactive protection remain. Broader nonprojectile indirect harm, incapacitation/rescue, other return modes and PS05 background fairness still need their applicable decisions; this does not select a general PvP opt-in prerequisite.

Reuse the [first threat/death/departure design and evidence](../verification/first-threat-encounter.md) and [Batch 06's paired combat design](../projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md). NPC-to-NPC lethality, including Ada, is resolved; actual integration and independent-character/combined acceptance remain in [CF](parallel-batch-06-rivals-and-contested-ground.md).

The selected [roaming pair](../projects/first-playable-roaming-feature-spec.md), [cooperation pair](../projects/first-playable-cooperation-feature-spec.md) and [survival/recovery pair](../projects/first-playable-survival-feature-spec.md) complete first-playable predator/group behavior, independent human supply trips, perceived camp discovery, voluntary ceasefire and pre-campfire recovery design. RW/CP/SV and [SH07–SH12](editable-shelters.md#sh07--natural-material-roles-and-selected-world-definitions) retain real delivery and qualification. No raid script, forced negotiation, hidden target tracking or automatic successful recovery supplies that evidence.

**Owners/dependencies:** BW14, MP, threat/rivals/AG, lifecycle/time and PS05/PS-D01. Remaining nonprojectile indirect harm, incapacitation/rescue and dangerous-logout rules still require their own decisions. NPC afterlife is DG33; richer care is DG21. No new general damage or public-PvP permission follows from first-playable conflict.

#### DG08 — Finding a community and participating publicly

ND02/ND37: select discovery, visiting/settlement, newcomer character entry, reporting, participant controls, operator evidence and mistake review for one public journey. Discovery does not grant admission.

**Owners/dependencies:** MP, PD08/PD10, data/privacy, D68 and PS05–PS06. Reuse invited multiplayer and consume applicable DG07 protection/admission decisions before public entry. A small offering does not require wider scale or the optional well-being program.

#### DG09 — Resident conduct for a selected audience

ND27: distinguish official-service conduct from authored fiction within the selected adult audience. Resolve sensitive conversations, human/AI disclosure and any adopted relationship/continuity or resident-memory policy before enabling that experience.

**Owners/dependencies:** PD07/PD10, NC/CR, D16/D21 and privacy. Archive proposals are not blanket release gates. Public enforcement powers belong to DG08, not fictional resident behavior.

#### DG10 — A chosen human social experience

Conditional ND31: select mutually accepted introductions, a recurring small group or family participation. Define contact/disclosure consent, attribution, scheduling, opt-out and problem handling.

**Owners/dependencies:** MP/NC/PD and D68. Invited adult use may reuse current multiplayer; public matching consumes DG08. Any different audience requires its explicit decision. Venues/partners are separately selected, not compulsory platform expansion.

#### DG11 — Evidence for a selected well-being objective

[The optional connection-study proposal](../projects/wellbeing-evidence-feature-spec.md) supplies a finite feasibility comparison for independently consenting known-friend adults. [WBE](wellbeing-evidence.md) owns study adoption, technical/operational preparation and evidence.

**Owners/dependencies:** research/measurement and PD/data/privacy. Resolve the actual question, comparison, minimal opt-in data, retention, withdrawal and interpretation before collection. This is independent of ordinary game testing; engagement does not establish a health benefit.

### Band 3 — Broaden creation and expression

#### DG12 — Create a world and reuse an invention

Reuse [Batch 07](parallel-batch-07-playable-world-creation.md) for supported opening authoring, exact review, native readiness and fresh-host activation. Generated-tool use and complete first-play acceptance retain their own checks. Broader laws, populations and hosts require selected extensions; FPV's main-scenario content does not replace creation transport.

[World creation](../projects/world-creation-feature-spec.md) also supplies the product proposal for retaining a useful invention, reusing it with complete dependencies and rights, and eligible free release to a known recipient. Its library technical/delivery work remains open independently of opening acceptance.

**Owners/dependencies:** INV-4/INV-8, EWF11/EWF12, host/admission owners and [WC limits](../limits/world-creation.md). Preserve origin, destination bindings, independent knowledge/resources, refusal and update/removal behavior. General stats, public matching and a marketplace are not prerequisites; commercial distribution is DG28.

#### DG13 — Editable shelter and useful places

Reuse the [shelter feature specification](../projects/editable-shelters-feature-spec.md), [technical design](../projects/editable-shelters-tech-design.md), [world profile](../worlds/base/editable-shelters.md), [SH](editable-shelters.md), [limits](../limits/editable-shelters.md) and [evidence](../verification/editable-shelters.md). Flat one/two-bay and single-bay lean-to evidence covers useful open shelter, real parts, permissions, ordinary use, reclaim and selected rain/drying, not enclosed camp defense.

**Required first-playable wall/entrance extension: Done — designed.** The existing [technical design's natural camp section](../projects/editable-shelters-tech-design.md#11-first-playable-camp-construction-and-defense), [world profile](../worlds/base/editable-shelters.md#first-playable-natural-camp-profile) and SH07–SH12 specify obtainable natural inputs/known manufacture, real wall and sliding-gate geometry, inside bar, exact contribution/alteration rights, reclaim, selected damage/repair and recovery. [SV](first-playable-survival.md) supplies the connected material routes and [CP](first-playable-cooperation.md) supplies voluntary contributions. Broader home psychology, larger structures and general structural physics remain separate; open-shelter evidence does not qualify this new design's runtime.

**Owners/dependencies:** SH, INV-6, SW/PO/BW and shared state. Heat is DG20, medical effects DG21, institutions DG32 and selected hearing propagation DG26; none is a universal prerequisite for the first useful camp.

#### DG14 — Useful competence and practice

Reuse [authored stats](../projects/authored-stats-feature-spec.md), its [technical design](../projects/authored-stats-tech-design.md), [practical-competence profile](../worlds/base/practical-competence.md), [PC](practical-competence.md) and [evidence](../verification/practical-competence.md). The selected finite sling-practice/coaching consumer has delivery evidence; PC06 human appreciation is qualification, not missing design.

**Owners/dependencies:** EWF02/EWF04, INV, AC/AE and shared state. Select an additional useful action/check consumer before generalizing. Preserve actual practice, observation, coaching and hearsay meanings, costs and uncertainty; the optional roof/dice example does not make routine actions random. Personality change remains DG23.

#### DG15 — An optional story perspective

[After you left](../projects/story-perspectives-feature-spec.md) supplies a narrow external familiar-activity product proposal. [NC20](narration-and-conversations.md) retains technical/disclosure delivery and [narration limits](../limits/narration.md) its proposed envelope.

**Owners/dependencies:** NC/privacy and D57. Qualify the selected human-only disclosure, voluntary reading, correction, retention and cost before enabling it. Human reading does not grant character knowledge. Private thoughts, other-human material and broader cutaways require separate decisions; ordinary discovery is DG01.

#### DG16 — A useful personal journal extension

[The personal Journal edition](../projects/personal-journal-feature-spec.md) proposes eligible selected entries, optional title/interpretation, exact preview and private PDF/text output. [NC21](narration-and-conversations.md) and [JP limits](../limits/narration.md) retain technical/privacy/accessibility delivery. A saved draft is a separate resumption convenience.

**Owners/dependencies:** NC, data/privacy, art-rights and Journal owners. Select a useful extension against current Journal use. Shared editions, real-life reflection, illustrations and print products need their own rights/consent decisions; none gates a narrow text edition or authorizes full-world/private-history export.

### Band 4 — Make communities last

#### DG17 — Continuing communities, clocks and quiet-world funding

[Continuing lives](../projects/continuing-lives-feature-spec.md) first contributes purposeful attended activity, appropriate stopping and a useful later encounter. [The community profile](../worlds/base/continuing-communities.md) proposes a separate finite continuing-world offer with real provisions, return and exhausted-funding behavior.

**Owners/dependencies:** PS02–PS06, activity/agency, time/accounting and [PS limits](../limits/product-scalability.md). Consume DG02 behavior and applicable DG07 protection. Current mechanical clock and absence rules remain controlling until an authorized change; resolve PS-D03/PS-D06 before dependent new clock or service promises. Account for human/model delays and meaningful interests, not only pantry stock. General coarse execution, new calendars and crowds are not automatic prerequisites for every attended slice.

#### DG18 — Worthwhile crowds and background social scenes

**Ordinary-speech integration:** [SPK](speech-and-social-perception.md) replaces the earlier joined-conversation assumption with source-linked, actor-permitted multi-person reading and one next addressee. Actual hearing, independent participation and useful context remain required; a new participant gains no earlier unheard turns. PS04 retains its separate focus/gist/crowd and qualification work.

[Attention and scenes](../projects/attention-and-scenes-feature-spec.md) and [the gathering profile](../worlds/base/social-gatherings.md) propose useful directed conversation and a small exact gathering before independently selected gist, vocal activity or larger crowds. Shared reading follows actual participation and evidence.

**Owners/dependencies:** PS04/PS06, PS-D02, EPR/HE/NC, agency/performance. Consume DG02 attention boundaries; use DG17 only for an unattended consumer. Timed speech belongs to DG26. Qualify actual cost/quality envelopes rather than set a universal population ceiling or require an artificial comparison workload.

#### DG19 — Supplies that change over time

[Changing supplies](../projects/changing-supplies-feature-spec.md), its [world profile](../worlds/base/changing-supplies.md), [CS](changing-supplies.md) and [limits](../limits/changing-supplies.md) cover independently selectable preservation/food condition and resource renewal. Product proposals exist; adoption, technical/stateful-lot delivery and qualification remain open.

**Owners/dependencies:** BW/PO/INV, shared state and time. Identify a useful preparation/outing choice before adding aging. Include actual food/work costs, inherited condition, partial work, scarcity and absence; renewal with nonperishable surplus has different consequences. Attended work can use the current clock; new continuing-world behavior consumes DG17. Generations are DG31.

#### DG20 — Heat, ignition and material consequences

[Heat and materials](../projects/heat-and-materials-feature-spec.md), its [world profile](../worlds/base/heat-and-materials.md), [HM](heat-and-materials.md) and [limits](../limits/heat-and-materials.md) separate a complete firing activity from dry-material fire, moisture, resident making and combined food/fire deliveries. Select the useful activity and independently complete stage.

**Owners/dependencies:** INV-6/BW26, PO/SW, state/time and applicable human protection. A chosen fire stage must preserve the brief-source dry-twig versus substantial-wall comparison, finite heat, actual local damage, extinguishing/cooling, surviving geometry and recovery. First firing need not require spread, illness, food aging or general structures. A bowl's appeal is not assumed from storage already served by woven containers.

#### DG21 — Injury, illness and useful care

[Recovery and care](../projects/recovery-and-care-feature-spec.md), its [profile](../worlds/base/recovery-and-care.md), [tracker](recovery-and-care.md) and [limits](../limits/recovery-and-care.md) propose awake material-free camp recovery followed by independently selectable field dressing and willing help. Preserve needs, scars, current death and actual danger.

**Owners/dependencies:** ACT/BW, actions, state and lifecycle; DG07 for affected human outcomes. Adoption, technical delivery and qualification remain open. A new illness requires its own useful cause/symptom/uncertainty/treatment/resolution loop; deep anatomy, fire and NPC ghosts are not prerequisites for ordinary recovery.

#### DG22 — Durable agreements and a small world economy

[Durable agreements](../projects/durable-agreements-feature-spec.md), its [profile](../worlds/base/durable-agreements.md), [INV-20.5a–f](inventions-and-world-evolution.md) and [limits](../limits/durable-agreements.md) propose a finite known-output commission paid in goods on actual later delivery. Optional advances and a narrow voluntary association are separate deliveries; no default currency or deadline is implied.

**Owners/dependencies:** DG06 assent/custody, INV-20/PO/BW/social and D11/D18/D64. Resolve actual adoption and technical work. Preserve amendments, withdrawal, default, owner-local endings, claims and knowledge. Currency requires issuance/sinks/loss rules only when selected; broader credit/escrow/government is DG32 and real-money billing is DG27.

#### DG23 — Characters changed by their experience

[Experience-shaped characters](../projects/experience-shaped-characters-feature-spec.md), its [profile](../worlds/base/experience-shaped-characters.md), [EC](cognition-redesign.md) and [memory limits](../limits/memory.md) propose specific revisable outlooks and older interpretation without changed witnessing. Dreams, human-reviewed suggestions and deliberate coarsening are independent extensions, not a default weekly pass or numerical trait ladder.

**Owners/dependencies:** ACT07/ACT08, CR06/CR09, CE and provenance/correction/forgetting. Preserve protected identity, consequential distinctions and obligations; repetition grants no personality points and later choices remain independent. Technical/live-quality qualification remains open. DG02 owns compelling initial people; DG25 changes selected shared history, not recollection alone.

#### DG24 — Text messages inside an authored world

[World text messages](../projects/world-text-messages-feature-spec.md) and the [message-slate profile](../worlds/base/text-messages.md) propose optional mutual contact exchange and private asynchronous notes. Submission, arrival and reading are distinct. The first two-human journey precedes separately qualified NPC correspondence.

**Owners/dependencies:** NC22, MP/CR/data, world affordances and [text limits](../limits/narration.md). Technical/privacy delivery remains open. No primitive-start device, account-derived fictional knowledge, presence/read receipts, attachments or artificial delay is implied. Calls consume the relevant contact/delivery choices in DG26.

#### DG25 — Deliberate corrections and shared restoration

[Corrections and shared restoration](../projects/corrections-and-shared-restoration-feature-spec.md) proposes independent new attributed speech and protected coherent same-world/private-history restore. [HE06](hearing-and-speech.md), [SL10](save-and-load.md), [hearing limits](../limits/hearing-and-speech.md) and [persistence limits](../limits/persistence.md) retain adoption and technical/runtime work.

**Owners/dependencies:** HE/SL/NC/CR/data/privacy and D60/D66. Correction does not rewrite historical hearing, force belief or trigger automatic semantic repair. Shared restore preserves current authority/accounting, erasure, current-bound-person refusal, pre-load preservation, notice and paused return. Creator-readable private export, branches/merge and selective item/message rescue are outside the first scope. Ordinary corrections, save/load and PD06 recovery are not blocked by these optional extensions.

### Band 5 — Add useful spoken communication

#### DG26 — Voice, calls and selected hearing extensions

**Independent text slice designed:** [NST00](npc-speech-streaming.md#nst00--complete-the-selected-design-and-reconcile-owners) settles immediate shared public NPC text, with fixed first-publication hearing and no physical speaking duration. It does not wait for or close this group's voice/call, timed doorway or propagation decisions.

ND15, ND14's calls and separately selected ND16 propagation/media families. Settle audio, committed words, transcripts, speed, interruptions and per-listener eligibility before dividing playback, speech input and human voice. The [SPK design](speech-and-social-perception.md) already owns the earlier ordinary text-speech, stable recognition and native sound-reaction slice; those capabilities do not wait for a voice provider or this group's media implementation.

[Voice and calls](../projects/voice-and-calls-feature-spec.md), its [profile](../worlds/base/voice-and-calls.md), [HE07](hearing-and-speech.md) and [NC23](narration-and-conversations.md) propose permitted committed-word playback, reviewed microphone drafts, explicitly enabled private two-human calls, a later timed doorway exchange and separately qualified raw human voice.

**Owners/dependencies:** HE/NC/MP, spatial/world owners, D10/spending and PS04 for timed speech. Calls consume DG24 contacts; local playback does not. Preserve text-complete participation, listener-specific fragments, unknown identity, mute/revocation/reconnect and actual speed/cost semantics. Doorway behavior uses real geometry; phrase-timed speech needs a qualified common pace. No provider, full acoustics catalogue or primitive-start phone is selected.

### Band 6 — Offer sustainable service and wider participation

#### DG27 — Customer and supporter offers

[The offer comparison](../projects/initial-commercial-offer-decision-brief.md) and [customer-offer specification](../projects/customer-and-supporter-offers-feature-spec.md) supply product preparation. [CO01–CO06](commercial-offers.md) and [limits](../limits/commercial-offers.md) own actual adoption, technical/payment delivery and evidence. A managed-world subscription is a candidate, not established player preference.

**Owners/dependencies:** PD10, billing/entitlements, INV-13, D17/D35/D37 and PS-D06 where continuing operation is offered. Separate access, invention units, provider funding and optional dedication. Compare credible browser offers before choosing terms; use renewal evidence only for recurring offers. Patron benefits, marketplace allocation and creator grants are independently selected, not gates for ordinary game learning.

#### DG28 — Published packs and creator revenue

[Published packs and creator revenue](../projects/published-packs-and-creator-revenue-feature-spec.md), [PACK](published-packs-and-creator-revenue.md) and [limits](../limits/published-packs-and-creator-revenue.md) propose a curated catalogue, complete rights/dependencies, acquired-version continuity, human-selected fixed allocations, collaborator shares and payout/remedy behavior.

**Owners/dependencies:** DG12 provenance/reuse and applicable DG27 offers; INV-8/EWF11, PD10 and D35/D36/D43/D44. Actual terms, amounts, payee/rights verification, technical delivery and usefulness/economics remain open. Free sharing needs no payment onboarding. Cross-operator proof/synchronization and a fund remain separate.

#### DG29 — More participants and travel between worlds

[Participants and world travel](../projects/participants-and-world-travel-feature-spec.md) and [PT](participants-and-world-travel.md) propose a complete small visit, domain rights, imports/clocks, fair admission and safe return, alongside broader workload comparisons.

**Owners/dependencies:** PS05–PS08, MP/access, transfer/data/time/performance and [PS limits](../limits/product-scalability.md). Consume actual offered activities and applicable protection/entry/definition-rights decisions. Use DG17/DG18/DG25 only when their capabilities are offered. A visit need not require unattended communities, crowds, a marketplace or campaigns; technical integration and supported capacity remain open.

#### DG30 — A creator fund and contributor governance

[The creator-fund proposal](../projects/creator-fund-and-contributor-governance-feature-spec.md), [FUND](creator-fund-and-contributor-governance.md) and [limits](../limits/creator-fund-and-contributor-governance.md) define a conditional finite manual round, applicant/grantee journeys, rights, milestone payments, partial work, conflict review and closure.

**Owners/dependencies:** D37 and program/financial/rights/platform-authority owners. Adopt actual funding, eligibility, agreements and advisory versus binding influence before operating. Neither a subscription nor a dedication opens a fund or voting program; software follows an actual operating need.

### Band 7 — Choose deeper society and generativity

#### DG31 — Generations and deeper biology

[Generations and family life](../projects/generations-and-family-life-feature-spec.md) and [childhood/population](../projects/generations-and-family-life/childhood-and-population.md) supply adult relationships, optional non-explicit sex, separate planned conception, pregnancy/birth, actual care/adoption, independent interests and adulthood. Audience/presentation is resolved; proposed developmental/care values are not automatically adopted.

**Owners/dependencies:** [GEN](generations-and-family-life.md), ACT/BW/PS, [profile](../worlds/base/generations-and-family-life.md) and [limits](../limits/generations-and-family-life.md). GEN04 preparation does not close GEN05–GEN07 delivery. Consume only selected housing/care, clock/funding and resource capabilities. Public/unattended families, deeper biology and full ecology require their own scope; government or spoilage is not a universal prerequisite.

#### DG32 — Larger institutions and economic obligations

[Shared equipment and institutions](../projects/shared-equipment-and-institutions-feature-spec.md), the [Clearing Tool Library](../worlds/base/shared-equipment-and-institutions.md), [INV-20.5g–l](inventions-and-world-evolution.md) and [limits](../limits/shared-equipment-and-institutions.md) propose exact-object lending, owner-issued keeper authority, return without a present keeper, departure/loss/closure and optional held collateral.

**Owners/dependencies:** DG06/DG22 assent/group meanings, INV-20, PO/social and D11/D18. Guest borrowing needs no membership; first lending is unsecured without automatic deadline/fee/interest. Adopt actual mandates, property consumers and technical delivery before offering it. Fictional title or office grants no platform/data/billing power; broader currency, credit and government remain separate.

#### DG33 — Extraordinary minds and life after death

[Extraordinary minds and afterlife](../projects/extraordinary-minds-and-afterlife-feature-spec.md), its [profile](../worlds/base/extraordinary-minds-and-afterlife.md) and [limits](../limits/extraordinary-minds-and-afterlife.md) propose voluntary local contact with a known deceased adult, a separately earned finite-resource return, and independent deliberate telepathy.

**Owners/dependencies:** [BW15](base-world.md), [EWF10T](extensible-world-foundation.md), ACT/AG/CR, identity/lifecycle and evidence/privacy. Adoption/delivery remain open. Preserve willing participation, actual retained experience, control and disclosure. Compulsion, passive mind reading, shared memory and colony control are separately selected families; human recovery does not depend on ghosts.

#### DG34 — Shared campaigns with local opportunities

[Shared campaigns](../projects/shared-campaigns-feature-spec.md) and [Ash Road](../worlds/base/shared-campaigns.md) propose two useful local outings and a finite nonlethal adversary in the same world, followed by a separately qualified optional operation. [PS07/PS08](product-scalability.md) and [campaign limits](../limits/product-scalability.md) retain adoption/delivery and broader evidence.

**Owners/dependencies:** campaign/access/time/data and PS-D05; DG29 only for actual cross-world use. Define notice/revision promises, local participation, time-zone/reconnect access, recognition and one canonical outcome. Local opportunities need not wait for government, generations, unusual minds or a siege system.

### Band 8 — Insert other expansion only at its trigger

#### DG35 — A selected platform or offline capability

[The platform/offline decision](../projects/completed/platform-and-offline-decision-brief.md) selects the browser for now. No desktop package, native/console client, replacement renderer or offline product is selected. Reconsider only for a new explicit audience or production need.

**Owners/dependencies:** ND34, SW10, UIUX/AC, MP/PD and host/provider owners. Current browser controls, hosting and D09 device qualification remain active. A future desktop wrapper, replacement client and offline simulation are distinct choices; offline needs its own host/provider policy and equivalent-play comparison.

#### DG36 — One useful application beyond the game

Conditional ND32: identify one learning, rehearsal, writing, agent-evaluation or external-developer problem and test useful transfer or repeated demand.

**Owners/dependencies:** D25/R16 and the underlying capability/product/research owners. Define user, rights, feedback/scoring, responsibility and actual support boundary. A separate offer does not automatically require a general SDK, clinical product or the complete ideation library.

### Shared decisions that keep parallel work separate

| Shared meaning                         | Owning boundary                                                                                                                                                                                |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Action, perception and knowledge       | DG02 uses AG/EPR/HE/NC; DG01 presents permitted opportunities, DG18 groups actual evidence and DG26 extends selected hearing/media. None invents another actor's action or private knowledge.  |
| Human risk, clocks and funding         | DG07 handles selected participation risk; DG17 handles new clock/quiet-world behavior through PS. DG08/DG29 consume it for entry/capacity and DG27 for actual customer terms.                  |
| Materials and consequences             | DG13 construction, DG19 food/resource change, DG20 heat and DG21 bodily effects share PO/state/time owners rather than duplicate writable custody, moisture or progress.                       |
| Facts, memories and history            | DG23 interpretation, DG25 selected correction/restore and DG04 recall consume canonical provenance. DG09/DG15/DG16 cannot redefine historical events through disclosure or presentation.       |
| Rights, money and attribution          | DG12 establishes reuse/provenance; DG28 publication/payouts, DG27 customer/supporter fulfillment and DG30 funds consume actual shared rights. Fictional currency/institutions remain separate. |
| Public operation and fictional conduct | DG08 owns selected participation/enforcement, DG09 adopted resident policy and DG10 its social pilot. Fictional governments and optional research grant no operator powers.                    |

Investigate independent questions while an input is pending, but do not settle dependent contracts around assumed answers. Reconcile overlapping slices in their canonical owners before signing off a combined design.

### Coverage of every design need

Each ND entry retains one preparation description below. Multiple DGs indicate distinct slices, not duplicate ownership or permission to close the whole need from one consumer.

| Need | Groups           | Boundary                                                                                                                                                  |
| ---- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ND01 | DG12             | Opening assembly; broader worlds selected separately                                                                                                      |
| ND02 | DG08             | Discovery, settlement and admission                                                                                                                       |
| ND03 | DG14             | Additional useful stat/check consumers                                                                                                                    |
| ND04 | DG14, DG23       | Practical competence versus personality change                                                                                                            |
| ND05 | DG21, DG31       | Care versus deeper biology                                                                                                                                |
| ND06 | DG19, DG31       | Renewal versus generations; first-playable resources/predators stay in FPV/BW/AG                                                                          |
| ND07 | DG13             | Required camp wall/entrance versus broader homes                                                                                                          |
| ND08 | DG13, DG20       | Shelter exposure versus thermal effects                                                                                                                   |
| ND09 | DG06, DG22, DG32 | Immediate trade, deferred agreements and complex obligations                                                                                              |
| ND10 | DG06, DG22, DG32 | Required small cooperation versus associations/institutions                                                                                               |
| ND11 | DG07, DG33       | Human/conflict rules versus NPC afterlife                                                                                                                 |
| ND12 | DG12, DG28       | Free library reuse versus commercial distribution                                                                                                         |
| ND13 | DG01, DG35       | Ordinary controls versus selected device expansion                                                                                                        |
| ND14 | DG24, DG26       | Text versus calls                                                                                                                                         |
| ND15 | DG26             | Speech media                                                                                                                                              |
| ND16 | DG02, DG18, DG26 | Ordinary speech/social evidence designed under SPK and immediate shared NPC text under NST; selected media and further hearing extensions remain separate |
| ND17 | DG25             | Attributed correction versus administrative retcon                                                                                                        |
| ND18 | DG01             | Static discovery versus broader place/narration families                                                                                                  |
| ND19 | DG23             | Older interpretation and optional dreams                                                                                                                  |
| ND20 | DG04             | Conditional retrieval comparison                                                                                                                          |
| ND21 | DG33             | Deliberate telepathy versus broader mental families                                                                                                       |
| ND22 | DG27             | Offer adoption and customer lifecycle                                                                                                                     |
| ND23 | DG28             | Allocation, marketplace rights and payouts                                                                                                                |
| ND24 | DG27             | Optional recognition/dedication                                                                                                                           |
| ND25 | DG30             | Conditional fund/governance operation                                                                                                                     |
| ND26 | DG03, DG27       | Player learning versus paid-offer evidence                                                                                                                |
| ND27 | DG09             | Selected service conduct/audience policy                                                                                                                  |
| ND28 | DG05             | Optional session/return experience                                                                                                                        |
| ND29 | DG11             | Optional well-being study                                                                                                                                 |
| ND30 | DG16             | Personal edition versus shared/print extensions                                                                                                           |
| ND31 | DG10             | Conditional human social pilot                                                                                                                            |
| ND32 | DG36             | Selected beyond-game use                                                                                                                                  |
| ND33 | DG19             | Food condition and preservation                                                                                                                           |
| ND34 | DG35             | Browser retained; other platforms conditional                                                                                                             |
| ND35 | DG25             | Protected shared restore versus broader portability/history                                                                                               |
| ND36 | DG15             | Selected external perspective versus other cutaways                                                                                                       |
| ND37 | DG08             | Public reporting and operator authority                                                                                                                   |
| ND38 | DG01             | Player skill during action execution versus action selection/native outcome                                                                               |

## Product scalability: substantial plans already exist

The [scalability suite](../product-scalability/README.md), [feature specification](../projects/product-scalability-feature-spec.md), [technical design](../projects/product-scalability-tech-design.md), [PS tracker](product-scalability.md) and [limits](../limits/product-scalability.md) own this direction. PS01's completed preparation and bounded component evidence do not close PS02–PS08. Reuse the plans rather than create another scheduler or scalability backlog.

| Existing work                   | Remaining preparation and consuming groups                                                                                                                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PS02–PS03: continuing activity  | Select supported families, coarse execution, interruption and truthful fallback. DG02/DG17; [background progression](../product-scalability/background-progression.md).                                                                                    |
| PS04 / PS-D02: attention/scenes | Select useful sensory/scene families, focus and exact-language exceptions with quality/cost evidence. DG02/DG18/DG26; [attention](../product-scalability/attention-and-scenes.md).                                                                         |
| PS05 / PS-D01: participation    | Resolve selected background harms, encounter entry/exit, standing defenses, reconnect and finite dangerous-logout continuation while preserving human protection. DG07/DG08/DG29; [participation](../product-scalability/participation-and-protection.md). |
| PS05 / PS-D03: clocks           | Assign needs, aging, work, memory, appointments and campaigns to explicit clocks with restart/shared-economy consequences. DG17; [time](../simulation-time.md).                                                                                            |
| PS06: admission/capacity        | Qualify activity-specific costs and fair admission for parties, residents, return and growing effects; no universal player-per-region count. DG08/DG18/DG29; [capacity](../product-scalability/capacity-and-economics.md).                                 |
| PS07 / PS-D04: domains/travel   | Select entry/build/damage/import rights, powers, clock/economy compatibility and safe arrival. DG29; [worlds and belonging](../product-scalability/worlds-and-belonging.md).                                                                               |
| PS07 / PS-D05: campaigns        | Select notice/revision, time-zone coverage, return and contribution recognition with one canonical outcome. DG34; [campaigns](../product-scalability/shared-campaigns.md).                                                                                 |
| PS03/PS06 / PS-D06: funding     | Define authorized quiet-world activity and exhaustion behavior separately from retained history. DG17 supplies service meaning; DG27 consumes it in terms.                                                                                                 |
| PS08: evidence                  | Qualify each offered slice; broader population/history, concentrated demand and mass-return comparisons belong with DG29/DG34.                                                                                                                             |

[PS-D01–PS-D06](../../archive/05-project/open-decisions.md#product-scalability-integration-choices) own consequential choices. Current elapsed-time integration, ordinary absence handling and regional data ownership retain their existing designs and delivery owners.

## AI-assisted game production: research and design integration

Use the [AI game-development research](../../archive/02-research/ai-game-development/README.md) for evidence and tool comparisons, and the [production handbook](../production-workflows/README.md) for reusable routes from ideas through editable art, assets, animation, scenes, interfaces, character situations and feedback to a working game result. Existing feature designs and trackers own runtime behavior, delivery and acceptance.

Production should give inventions a recognizable identity; residents should be worth spending time with; places should support discovery, atmosphere and meaningful approaches; and coordinated presentation should make actions understandable and satisfying. The existing [playability gates](../projects/five-product-feature-specs.md#playability-gates) own judgment of the complete experience. These opportunities guide a selected slice without requiring a new generic AI-production feature or a second fun-evaluation system.

| Area                                                     | Preparation to carry forward                                                                                                                                                                                                                                                                             | Existing owner and disposition                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual style and a repeatable asset family               | Choose a useful next object, body or place; retain the brief, editable sources, revision route and in-game evidence. Decide the expressive identity and representation from the actual camera and intended use. Broader body, use/rest, equipment, rights, cleanup and device qualification remain open. | [Art studies](art-direction.md), [V3D01/V3D12](3d-pixel-art.md), [3D feature](../projects/3d-pixel-art-feature-spec.md), [technical design](../projects/3d-pixel-art-tech-design.md) and [R02](../../archive/05-project/research-backlog.md). The mercenary idle/walk study exists. The wider pipeline has a design; do not reopen it as wholly undesigned.                                                                   |
| Inventions that retain their visual identity             | Develop reusable visual vocabulary that can express a player's idea across a world object, relevant equipment view and icon. Use the existing accepted fallback and supported family route; identify any additional capability before promising it.                                                      | DG12 and [INV-12](inventions-and-world-evolution.md#inv-12--progressive-in-game-art-and-compatible-publication), with the [runtime art contract](../invention-art-pipeline.md). General generation, family promotion and publication still need their existing implementation and qualification. Offline asset creation does not close them.                                                                                  |
| Whole characters with memorable behavior and performance | Connect authored identity, a situation, visible form, motion and optional voice to full episodes of independent choice and later consequences. Compare actual player appeal alongside grounding and cost, using the current resident as a meaningful baseline.                                           | DG02, [CE01–CE05](character-experience.md), [character feature](../projects/compelling-characters-feature-spec.md) and [technical design](../projects/compelling-characters-tech-design.md). The authored psychology and whole-life acceptance choices stay with these owners. A model audition is an empirical task, not a new NPC architecture.                                                                             |
| A coherent, useful game interface                        | Capture the actual current states; compare artwork, composition and faithful implementation separately. Carry a selected art kit and layout through existing panels, supported inputs and real content.                                                                                                  | [UI brief](../ui-design-brief.md), [UIUX](ui-ux.md) and existing interface feature/technical designs. The design system and delivered redesign already exist. Fresh visual diagnosis and player observation are pending evidence, not proof that React or PlayCanvas must be replaced.                                                                                                                                        |
| A distinctive playable outing and demonstrable promise   | Let practical invention change an approach, a resident's purpose change the situation, and an actual consequence matter later. Select the relevant instance for the slice; record voluntary response separately from technical success and cost.                                                         | DG03, the [playability gates](../projects/five-product-feature-specs.md#playability-gates), ND26 and the [commercial execution brief](../../archive/02-research/indie-launch-commercials/execution-brief.md). Enjoyment, audience interest and payment remain separate questions. This adds no release sequence or numerical market threshold.                                                                                |
| Sound, motion, effects and optional voice                | Design feedback around actual events and the intended experience; review timing, readability and the whole mix. Select optional media only within its existing proposed scope and technical preparation.                                                                                                 | [Feedback workflow](../production-workflows/audio-and-feedback.md), [hearing/speech](hearing-and-speech.md), DG26/HE07 and the applicable presentation owners. An offline recording or generated clip does not implement streamed speech, lip sync or new hearing semantics.                                                                                                                                                  |
| Saved workflows, skills and engine experiments           | Trial a concrete helper or graph where it can reduce repeated work, improve revisions or make worthwhile output feasible. Preserve source settings and inspect the actual export. Compare a Godot authoring route only against a real production question.                                               | [Tool audit](../../archive/02-research/ai-game-development/04-skills-and-tooling.md), [evaluation plan](../../archive/02-research/ai-game-development/11-evaluation-and-adoption.md) and the applicable task owner. Browser-only delivery remains selected in [DG35's decision](../projects/completed/platform-and-offline-decision-brief.md). Catalog coverage and desk research do not qualify a tool or justify migration. |

Use the existing 3D and compelling-character feature/technical pairs and the UI/playability briefs for the areas above. Each linked owner identifies unselected design choices, unfinished implementation and unrun empirical work. Add a new design need when a selected production route reveals a missing player capability or contract that its current owner does not cover.

## Intelligent individuals and efficient simulation: research-derived design follow-up

**October 15, 2026 · Selected paired designs complete; implementation and qualification remain open.** The [focused research inventory](../../archive/02-research/game-inspiration/research-progress-intelligent-simulation-2026-10-14.md) connects the [character guide and NPC-R01–R05 mapping](../../archive/02-research/game-inspiration/synthesis/characters-companions-and-relationships.md#8-openlegend-specific-research-subtopics-and-design-mapping), [game implementation study](../../archive/02-research/game-inspiration/references/game-ai-implementation-and-scale.md), [efficient simulation study](../../archive/02-research/game-inspiration/references/efficient-individual-simulation.md), [language-model societies and Simile](../../archive/02-research/game-inspiration/references/language-model-societies-and-simile.md), and [counterevidence/source qualifications](../../archive/02-research/game-inspiration/references/intelligent-simulation-verification-notes.md). The following checklist maps the commissioned design refinements to existing owners; it creates no duplicate ND entries, replacement mind, scheduler or evaluation programme. Checked means the selected design question is resolved, including conditional experiment/dependency boundaries; it does not mean the proposed experiment ran or the runtime feature shipped. Existing owners separately track implementation and evidence.

Native continuation, nested learned activities, required recent outcomes, personal perspective, reaction admission and shared request preparation already have designs and selected delivery evidence. Existing CE/AG/CR/AE/PF/PS work is not reset. Complete an existing acceptance case directly when no contract is missing; commission additional design only for the uncovered question. Characters, companions and relationships retain their broader scope: efficient cognition is one supporting concern, not a substitute for care, friendship, rivalry, pleasure or a worthwhile encounter.

### Paired design coverage — October 15, 2026

Mike commissioned the paired designs below. The [integration map](intelligent-simulation.md) records detailed readiness, policy dependencies and existing implementation IDs; the [design plan](../projects/completed/intelligent-simulation-design-plan.md) records the inspected source and completion checks. Mike resolved the three policy questions: exact calculated physical activity, compact expressive background contributions, and numerical personal reactions without mandatory prose alongside rich descriptions where useful. No developer answer remains outstanding for this selected scope. Broader service/crowd/approximation offers stay separate; the designed conditional profiling/routing comparisons are not a claim of measured optimization. Design completion is neither runtime completion nor a new implementation approval.

| Refinement                                          | Feature / technical owner                                                                                                                                                                                                                                                  | Selected scope and remaining runtime boundary                                                                                                                                                            |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chosen work, alternatives and stopping              | [Continuing lives §16](../projects/continuing-lives-feature-spec.md#16-research-refinement--a-chosen-life-can-continue-and-change) / [technical §§3–4](../projects/continuing-lives-tech-design.md#3-express-the-actual-choice-with-existing-composition)                  | Existing selected methods, exact bounds, interruption and legitimate endings; no new psychological law.                                                                                                  |
| Personal attention and quiet initiative             | Same pair, technical §4                                                                                                                                                                                                                                                    | Permitted meaningful changes through existing intake and quiet opportunities; source-linked numerical reaction profile is selected; whole-life quality remains unqualified.                              |
| Native work, selection and interpretation           | [Evaluation feature](../projects/intelligent-simulation-evaluation-feature-spec.md) / [routing design](../projects/intelligent-simulation-evaluation-tech-design.md#conditional-routing-and-calibration)                                                                   | Current/simpler/candidate comparison, invalidation and unavailable capabilities; no new production route or confidence threshold.                                                                        |
| Later personal consequences                         | Continuing lives §16 / [technical §5](../projects/continuing-lives-tech-design.md#5-later-conduct-uses-the-same-evidence-and-interpretation-owners)                                                                                                                        | Evidence, interpretation, numerical private reaction, rumor origins, correction and later choice; unrelated personality/need families remain separate.                                                   |
| Independent shared activity and readable intentions | [Attention and scenes §18](../projects/attention-and-scenes-feature-spec.md#18-research-refinement--independent-shared-activity-that-people-can-understand) / [technical design](../projects/attention-and-scenes-tech-design.md)                                          | Exact attended speech plus selected compact background contributions, individual interpretation/consent and actual work; no invented transcript.                                                         |
| Share computation first                             | Evaluation pair, [shared-computation design](../projects/intelligent-simulation-evaluation-tech-design.md#shared-computation-experiment)                                                                                                                                   | Full-caller profiling, semantic owners, complete reuse dependencies and rejection of unhelpful optimization; candidate algorithm follows an observed bottleneck.                                         |
| Truthful distant work and detail changes            | [Scalability §8](../projects/product-scalability-feature-spec.md#8-intelligencesimulation-research-refinement--october-15-2026) / [technical §11](../projects/product-scalability-tech-design.md#11-research-refinement-one-authoritative-world-under-efficient-execution) | Protected authority, earliest boundaries, reconstruction and truthful evidence; exact rate/work/trajectory/event families selected, with conservative current-path fallback and no approximate outcomes. |
| Concurrency, clocks and fair service                | Same scalability pair, technical §11                                                                                                                                                                                                                                       | Current commit, fairness, capacity, clock and accounting owners; broader operating offers retain PS-D decisions.                                                                                         |
| Whole episodes and complete cost                    | [Evaluation feature](../projects/intelligent-simulation-evaluation-feature-spec.md) / [technical design](../projects/intelligent-simulation-evaluation-tech-design.md)                                                                                                     | Matched episodes, legitimate alternatives, later return, held-out comparisons, complete measured costs and uncertainty.                                                                                  |

### Chosen activities, alternative means and satisfied stopping

- [x] **Refine only uncovered delegation.** For a selected continuing activity, define which materials, substitutions, risks, expenditure and stopping conditions the person actually chose; which interruptions suspend, abandon or revise that choice; and what remains available on return. Distinguish a learned method, a current purpose and personality. Hypothetical: permission to repair with designated timber does not permit taking another person's keepsake as an alternative material. Determine when current methods and ordinary choices suffice before proposing broader planning or learned habits. Preserve quiet satisfaction, familiar pleasure, refusal and solitude as legitimate endings, with no hidden survival/novelty script.

**Reuse:** [DG02](#dg02--one-resident-who-follows-through), [PS02](product-scalability.md#ps02--one-interruptible-life), [agency](agent-agency.md) and [AE09](action-experience.md#ae09--execute-chosen-nested-methods-through-existing-agency). Existing execution is not missing design; broader personally appropriate stopping/resumption remains [CE04–CE05](character-experience.md#ce04--a-complete-life-episode-with-continued-activity). Research: NPC-L001–L003/L015; simulation study §§2–3.

### Personally meaningful attention, quiet initiative and interruption

- [x] **Specify the overlooked situation before changing attention.** Decide how chosen interests, promises and supporting assumptions bring relevant changes into consideration, including quiet invitations, unfamiliar meaning and contrary evidence outside the current focus. Define delayed reconsideration, quiet initiative and burst handling without polling every possible concern or assuming inexpensive predicates recognize all personal significance. Distinguish not noticing, choosing to ignore, and unavailable cognition. Preserve relevant evidence arriving during another decision and avoid replacing a valid purpose merely because something changed.

**Reuse:** [CE03](character-experience.md#ce03--the-world-and-inner-experience-enter-attention-coherently), [AG06–AG07](agent-agency.md), [CR](cognition-redesign.md), [EPR](events-perception-and-reactions.md) and [PS04](product-scalability.md#ps04--coherent-scenes-and-limited-attention). Current quiet-reflection and fair intake mechanisms are foundations; reliable semantic attention remains unqualified. Research: NPC-L003–L005/L015; simulation study §3 and society study's information-delivery section.

### Native execution, inexpensive selection and deeper interpretation

- [x] **Design routing changes only for an observed failure or cost.** Define the error being detected, its personal consequence, missing evidence, reversibility and time to act before choosing a gate, cached choice or trained shortcut. Compare current routing and a credible simpler alternative; include the cost of gates that repeatedly say to continue. Define invalidation, unfamiliar cases and unavailable providers. Close scores can describe two well-understood alternatives; a strong preference can still be wrong. Neither a score gap nor a model's claimed confidence is a calibrated error estimate. Model-internal calibration cannot be assumed available through the configured API.

**Reuse:** [AG12](agent-agency.md#ag12--behavioral-value-and-cost-separately-authorized), [CR12](cognition-redesign.md), existing [cognition limits](../limits/cognition.md) and PS04. This selects no new escalation, threshold, model/vendor, training programme or paid retry and does not waive an agreed Jev-only condition. Research: NPC-L005/L014; society study §2; hybrid-controller counterexample.

### Experience that changes later conduct without rewriting history

- [x] **Refine retention/retrieval for a concrete later-choice omission.** Specify what must remain available from an apology, fulfilled promise, refusal or quiet act of care, and how a changed interpretation affects later conduct without becoming another person's private truth. Repeated retellings of one rumor must not become independent corroboration. Retained work progress is neither optional autobiographical recall nor proof that its emotional meaning survived. Compare changed and unchanged experience, correction/forgetting, alternative interpretations and the later return; do not mandate friendliness or a particular answer.

**Reuse:** [DG02](#dg02--one-resident-who-follows-through), [DG23](#dg23--characters-changed-by-their-experience), [ND19](#nd19--older-memory-transformation-and-dream-reinterpretation), conditional [ND20](#nd20--a-bounded-richer-memory-retrieval-comparison), [memory architecture](../memory-architecture.md) and CE02–CE05. Existing precise outcomes/perspective and DG23's product proposal need no replacement design. The selected numerical reaction is recorded under [D69](../../archive/05-project/open-decisions.md#d69--multidimensional-character-experience) and the [world-owned profile](../worlds/base/psychological-reactions.md); broader new psychological laws retain their own scope. Research: NPC-L006–L007/L016; society study §1.

### Independent shared activity and readable intentions

- [x] **Define only the shared meaning a selected encounter needs.** Establish accepted roles/terms, independent refusal and withdrawal, divergent knowledge and each participant's witnessed consequences for a useful small activity. Compare existing invitations/commitments with a broader social-practice representation before adopting one. Decide what visible preparation, progress, interruption and optional expression lets the player understand the activity; generated explanations are not proof of why a choice occurred. Preserve misunderstanding and legitimate disagreement without exposing private motives or forcing a crisis to make the scene interesting.

**Reuse:** [DG06](#dg06--reciprocal-exchange-and-small-cooperation), [DG18](#dg18--worthwhile-crowds-and-background-social-scenes), [social contracts](../worlds/base/social.md), [conversation](../narration-and-conversations.md) and CE04–CE05. Barter, outings and combat-help consent are foundations, not evidence of a complete general social system. Research: NPC-L007–L009/L013/L015; hypothetical research episodes §§5A–5C.

### Share computation before simplifying individual lives

- [x] **Select a measured bottleneck and its actual dependencies.** Distinguish reusable geometry, method compilation and information preparation from private knowledge, permissions and current intent. Profile data layout, allocation, locality, repeated queries and movement work through complete callers; separate route search, local avoidance and execution. Existing owner/invalidation and native-work designs should be implemented or qualified directly. Only a demonstrated gap needs new architecture; specify cold rebuilding, meaningful invalidation, conservative candidates and failure before adopting new caches, GPU work, distribution or one process per person. Stop if maintaining the optimization costs more than the work removed.

**Reuse:** [PF00/PF09–PF11/PF14](performance.md), [performance contract](../performance.md), current spatial/storage owners and [PS06](product-scalability.md#ps06--capacity-and-sustainable-economics). PF14's delivered shared preparation is not a missing project. Research: NPC-L010–L011; game study's Factorio/KCD sections; simulation study §§5–7. This is conditional profiling/design preparation, not a prerequisite for every character improvement.

### Truthful distant activity and transitions between levels of detail

- [x] **Refine each selected family's fidelity promise.** Define separately what presentation, physics, interaction, observation, deliberation and retained evidence compute or leave unknown. Preserve linked consequences: a distant person's unfinished delivery can affect a nearby gathering. Specify arrivals, observers, hazards, thresholds and rate changes that invalidate coarse advancement, plus supported expansion back into detailed play. Preserve exact identities, supplies and commitments; do not invent precise eyewitness memories or successful intermediate work. Camera distance alone cannot establish causal irrelevance. Aggregating anonymous ambience is a different promise from retaining distinct people.

**Reuse:** [PS02–PS05](product-scalability.md), [background progression](../product-scalability/background-progression.md), [DG17](#dg17--continuing-communities-clocks-and-quiet-world-funding) and [DG18](#dg18--worthwhile-crowds-and-background-social-scenes). Their general contracts and finite-community/gathering product proposals already exist. The selected first families use exact calculated advancement and ordinary bounded fallback; approximate outcomes remain an explicitly unselected later expansion. Research: NPC-L012; simulation study §8; society study §3.

### Concurrent decisions, clocks, funding and fair opportunities

- [x] **Resolve expansion-specific admission and service choices.** Keep one owner of committed effects while independent preparation overlaps; specify relevant freshness, resource contention, changed consent and explicit stale/cancelled/failed/completed outcomes. Reuse current fair intake before inventing another scheduler. For any expanded operating offer, settle time/capacity/funding and unavailable-service behavior, burst admission, quiet-person starvation and safe continuing work. Faster simulated time must not quietly let consequences outrun every character's decision service. Paid requests and already displayed outcomes cannot be assumed refundable or retractable by rollback.

**Reuse:** [AG04](agent-agency.md), EPR05, [PS05–PS06](product-scalability.md), [simulation time](../simulation-time.md) and [PS-D01–PS-D06](../../archive/05-project/open-decisions.md#product-scalability-integration-choices). Current control, pause and funding policies stand until a relevant decision is resolved. Research: NPC-L010/L013; simulation study §§7/10 and society study's concurrency section.

### Whole episodes, meaningful exceptions and complete operating cost

- [x] **Refine the existing comparison before claiming improvement.** Define scenario families, acceptable alternative trajectories and separate mechanical, personal, social and presentation judgments. Include routine success, satisfied stopping, meaningful repetition, quiet initiative, refusal, interruption/resumption, competing resources, a personally important exception, later recollection and provider outage. Vary one relevant experience/relationship while holding other permitted evidence and mechanics stable; prevent adjacent paraphrases leaking between calibration and evaluation. Judge the person by what they could know, not hidden world facts. More capable or more frequent generation is a comparison, not an oracle.

**Reuse:** CE05, AG12/CR12, [PS08](product-scalability.md#ps08--broader-experience-and-scale-qualification) and PF00/PF11. Record every preparation, shortlist, attention, recall, embedding, inference, reflection, validation, queue, storage and presentation cost/failure. Report cost per useful completed episode, real hour and simulated day; distinguish retained identities, active bodies, actual decisions and environment operations. Include model/version, hardware, clock, concurrency, steady/burst/tail latency and human reading/composition. Keep ordinary-case frequency separate from deliberately sampled rare failures. This refines existing qualification, not a parallel test programme. Research: NPC-L010/L014/L016; society study §4; simulation study §§10–11.

**Dependencies and completion:** use each owner's current designed/delivered slice first. Representative traces and a defined consequential error precede calibration or learned routing; a selected coarse activity and its clock/protection decisions precede reliance on approximation; an operating offer precedes new funding/admission policy. The selected questions are resolved in the [coverage map](intelligent-simulation.md); broader developer-owned decisions must still be answered before their separately selected expansion. Paired owners record scope, alternatives, world/engine responsibility, exact guarantees, failure/unknown behavior, dependencies and evaluation criteria; missing runtime acceptance alone does not require redesign. No universal cognition interval, population target, psychological law or new service policy is selected here. World-owned numerical reactions are explicitly included without forcing speech or a written thought.

**Evidence limits:** the research did not run OpenLegend benchmarks, train a controller, deploy a society or conduct player/paid-model trials. Survey/population prediction is not long-lived individual agency; token savings are not measured proportional latency savings; large retained populations are not simultaneous real-time decisions. Simile's calibration is task-specific and requires model access; the hybrid combat study helped some opponents while harming another. Several game sources are prototypes or abstracts, with current-controller access gaps recorded. These findings justify questions and comparisons, not assumed capabilities or a mandate to adopt every technique.

## Worlds, rules and long-lived communities

### ND01 — Assemble a new world from a creator's premise

**Selected opening design complete; acceptance and broader extensions open.** [World creation](../projects/world-creation-feature-spec.md), [Batch 07's technical design](../projects/parallel-batch-07-playable-world-creation-tech-design.md), INV-4/EWF12 and [WC limits](../limits/world-creation.md) own the supported draft/defaults/review/readiness/fresh-host journey. Generated-tool use and full first-play acceptance remain with [OC](parallel-batch-07-playable-world-creation.md).

Select broader laws, population/geography/knowledge profiles or hosts before extending that design. Preserve exact drafts, visible assumptions, unsupported-essential-mechanic refusal, failed/interrupted creation and existing admission. FPV02 routes required main-world content to BW/INV/SH without replacing transport. Sources: [creation proposal](../../archive/03-design-proposals/world-creation-and-discovery.md), D39/R23. Library reuse is ND12, not a prerequisite for a useful opening.

### ND02 — Discover a community, settle there and enter as a character

**Product proposal prepared; public discovery/settlement decisions and technical delivery open.** Reuse [participants and world travel](../projects/participants-and-world-travel-feature-spec.md), MP invitations/control/characterless entry, PS05–PS07 and production-data projections. [D68](../../archive/05-project/open-decisions.md#d68--world-entry-beyond-invites) owns new entry choices.

Select discoverable information, recommendations/new-community offers, joining an existing person versus authored entry, newcomer roles, abuse controls and perspective-correct return. Discovery does not imply permission to join. Public enforcement is ND37; [worlds and belonging](../product-scalability/worlds-and-belonging.md) retains the broader contract.

### ND03 — World-authored stats, checks and their effects

**Selected sling design delivered; additional consumers need scoped design.** Reuse the [stats pair](../projects/authored-stats-tech-design.md), [PC](practical-competence.md), EWF02/EWF04 and shared state. PC06 appreciation remains qualification.

Select a useful action/effect beyond the current consumer, then define authoring, ranges/defaults, modifiers, randomness or deterministic checks, interpretation and allowed effects. A displayed trait is not an enforceable rule; generic dice are not required. [The product specification](../projects/authored-stats-feature-spec.md), [limits](../limits/authored-stats.md) and [world-module contract](../../archive/07-technical-architecture/world-module-runtime.md) retain the candidate and extension boundaries.

### ND04 — Experience-shaped personality and practical skill growth

**Practical consumer delivered; outlook product proposal prepared.** Use DG14/PC for real practice, observation, coaching/hearsay and finite action effects; generic method learning stays with AE. [Experience-shaped characters](../projects/experience-shaped-characters-feature-spec.md) and [EC](cognition-redesign.md) own the descriptive revisable-outlook proposal and remaining technical/live-quality work.

Another competence or personality family needs explicit causes, attribution, uncertainty, reversal and consequences without forcing choices from labels. Protected initial identity, practical learning and historical witnessing remain distinct. Sources: [personality/learning](../../archive/03-design-proposals/agents-and-social-simulation.md), [product baseline](../../archive/01-requirements/product-baseline.md), ACT07/ACT08 and CR.

### ND05 — Richer bodies, illness and care

**Recovery/care product proposal prepared; adoption and technical delivery open.** Reuse [recovery and care](../projects/recovery-and-care-feature-spec.md), its [tracker](recovery-and-care.md), ACT/BW and [survival](../worlds/base/survival.md). New illness, anatomy or treatment families remain conditional beyond the selected recovery journey.

For a selected extension define causes, observable/uncertain symptoms, severity/time, actual treatment/resources, actor knowledge and death/save consequences. Neither body-state examples nor generic attributes implement biology. Sources: [physical-state proposal](../../archive/03-design-proposals/agents-and-social-simulation.md), F03 and EWF10.

### ND06 — Ecology, aging and generations

**Selected first-playable wildlife: Done — designed.** The [roaming feature specification](../projects/first-playable-roaming-feature-spec.md), [technical design](../projects/first-playable-roaming-tech-design.md) and [authored wildlife profile](../worlds/base/first-playable-roaming.md) settle finite feeding, ordinary habitat movement, locally perceived wolf-pack hunting, bear danger and independent human opportunity inputs. [RW01–RW06](first-playable-roaming.md) owns runtime/encounter qualification and consumes [native animal escape](../worlds/base/animal-responses.md) under CTR03–CTR04. This settles the selected local pack behavior; it does not complete renewal, full food webs, offspring, aging, reproduction or DG19/DG31.

**Supply/family product proposals prepared; adoption, technical delivery and broader ecology open.** DG19/CS owns renewal and DG31/[GEN](generations-and-family-life.md) owns [family](../projects/generations-and-family-life-feature-spec.md) and [childhood/population](../projects/generations-and-family-life/childhood-and-population.md) preparation. The adult/non-explicit direction is resolved, not proposed tuning or a calendar rewrite.

For broader ecology/lifecycle work, choose a concrete loop with observable scarcity/collapse, useful intervention, caregiving and food/housing/compute consequences. No automatic abundance or sustainable unattended population is assumed. The selected first-playable's finite resources/prey/predators proceed under SV/RW and existing BW/AG without waiting for regeneration or generations. Sources: [ecology/families](../../archive/03-design-proposals/world-and-player-experience.md), [time proposal](../../archive/03-design-proposals/time-and-simulation-speed.md), D16/D23/D27 and PS-D03.

### ND07 — Editable buildings that become usable homes

**Selected open-shelter design delivered; required first-playable wall/entrance extension: Done — designed.** DG13, [SH07–SH12](editable-shelters.md#sh07--natural-material-roles-and-selected-world-definitions) and the [extended shelter pair](../projects/editable-shelters-tech-design.md#11-first-playable-camp-construction-and-defense) settle natural inputs/known manufacture, support, real barriers/sliding entrance, access/cover, permission, staged alteration/reclaim and selected damage/repair/recovery. [SV](first-playable-survival.md) and [CP](first-playable-cooperation.md) own the connected material and willing-contribution paths. Preserve valid open-shelter evidence; new runtime and player acceptance remain open.

Explain the useful defensive and home activity, not merely the assembly. Broader household membership, large structures and general structural simulation remain separately selected. Sources: [construction proposal](../../archive/03-design-proposals/evolving-materials-and-construction.md), D31/R21, INV-6/PO/SW and [the world target](../worlds/base/playable-openings.md#a-camp-the-player-can-defend-and-call-home).

### ND08 — Material, weather, heat and fire interactions beyond campfires

**Selected rain/moisture consumer delivered; heat product proposal prepared, technical/expanded families open.** Reuse [shelter evidence](../verification/editable-shelters.md), BW19 campfire care and shared state. [Heat and materials](../projects/heat-and-materials-feature-spec.md), [HM](heat-and-materials.md) and INV-6/BW26 own selected thermal stages.

Choose actual playable heating/ignition/spread/extinguishing or transformation effects and bounded neighborhoods, material ownership, time and geometry consequences. The selected fire stage retains the dry-twig/substantial-wall comparison. First firing does not require general weather, body injury, food aging or a wet-tinder penalty. Sources: [material properties](../../archive/03-design-proposals/evolving-materials-and-construction.md), [heat/fire](../../archive/03-design-proposals/heat-and-fire.md) and [state influences](../../archive/03-design-proposals/state-systems-and-future-influences.md).

### ND09 — Negotiated barter, currency and durable commercial promises inside a world

**Immediate barter delivered; commission/lending product proposals prepared, adoption and technical work open.** Reuse PX02's exact consent/atomic custody and [INV-20](inventions-and-world-evolution.md). [Durable agreements](../projects/durable-agreements-feature-spec.md) and [shared equipment](../projects/shared-equipment-and-institutions-feature-spec.md) supply distinct proposed later consumers.

Select multi-lot negotiation, deferred delivery/default, advances, collateral or currency only as useful. Currency needs issuance/sinks/loss/ownership and circulation decisions under D11/R09; escrow/interest remain optional. Respect actual assent/amendment/settlement, claims and once-only release. Fictional money is separate from ND22/ND23 accounts. Sources: [economy proposal](../../archive/03-design-proposals/world-and-player-experience.md), [inventory](../ui-ux/inventory.md), PO/BW17.

### ND10 — Persistent groups, shared ownership and in-world institutions

**Paired outings delivered; selected first-playable cooperation: Done — designed; institutional proposals separately prepared.** The [cooperation feature specification](../projects/first-playable-cooperation-feature-spec.md), [technical design](../projects/first-playable-cooperation-tech-design.md) and [CP01–CP10](first-playable-cooperation.md) settle alliances, help, guidance, hunts, actual sharing, ceasefire and withdrawal through existing social/AG/CE/custody owners. These mutual statements and finite purposes grant no property/body authority, enforced future yield, social score or compelled choice. Runtime and useful independent behavior remain open. [DG22 associations](../projects/durable-agreements-feature-spec.md) and [DG32 equipment service](../projects/shared-equipment-and-institutions-feature-spec.md) retain adoption/technical delivery in INV-20.

For further institutional scope select a useful recurring arrangement and only its necessary membership, goals, delegation, property, obligations, notices, disputes and dissolution. Fictional titles do not create platform authority; an association does not itself supply property rights. Sources: [institution proposal](../../archive/03-design-proposals/world-and-player-experience.md), D18, PO/BW/MP.

### ND11 — Human conflict/recovery and NPC ghost continuity

**Selected direct-conflict slice: Done — designed; other lifecycle decisions remain open.** Sources: [base-world lifecycle and protection](../worlds/base/lifecycle-and-protection.md), D07/D15 and [BW14/BW15](base-world.md).

**Existing coverage:** protected human departure/return and the accepted recoverable-human-death direction remain controlling. BW14 retains combat participation, indirect harm and recovery; BW15 retains NPC ghosts, summoning and ordinary revival. Creator revival is a separate existing power. PS-D01 owns future dangerous-logout integration.

**October 17 selected extension — Done: designed.** The [combat-response feature specification](../projects/combat-and-threat-responses-feature-spec.md) and [technical design](../projects/combat-and-threat-responses-tech-design.md) settle world-enabled direct human PvP, actual projectile-contact harm, native animal escape and immediate independent humanlike responses. The [COMBAT ND11 synthesis](../../archive/02-research/game-inspiration/synthesis/combat-and-encounters.md#nd11--responsive-conflict-in-the-selected-base-world) records the narrow research transfer. [CTR01–CTR08/CTR10](combat-and-threat-responses.md) owns implementation and qualification. Separate PvP opt-in is not required in the selected bundled world; other supported worlds can differ. No runtime acceptance is closed by this design.

**Existing design for the selected next combat slice:** [Batch 06’s feature and technical pair](../projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md) already defines hostile NPC participation, physical ranged actions, evasion and help. Its NPC-to-NPC lethality choice is settled and the selected mechanics/content are integrated in current main; independent-character and combined encounter acceptance remains unfinished. Do not list that allocated scope as needing another design.

**Delivered bounded human-risk slice:** PG05, now integrated and qualified under [PX01](parallel-batch-04-expeditions-and-exchange.md#px01--a-readable-wilderness-threat), implements the owner-selected observational stag encounter, half-type corpse loss and campfire/new-life scars, exact final-blow review and 300 game seconds of vulnerable fade (five real seconds at normal speed). [Execution](../projects/completed/first-threat-encounter-tech-design.md) and [evidence](../verification/first-threat-encounter.md) define the delivered boundary. This does not complete ND11 or NPC ghost/rescue/ordinary-revival scope. Broader D07/PS-D01 remain unresolved; inactive protection is retained. The current cooperative-only attack admission is explicitly superseded as a target by the October 17 selected direct-PvP revision.

**Remaining preparation beyond the selected CTR scope:** choose any optional additional participation modes, separate incapacitation/execution state, new nonprojectile attributed indirect hazards and broader rescue/return modes. PG05's ordinary one-attack final-blow review, campfire reincarnation/scars and detailed simulated fade are already selected/implemented; do not reopen them implicitly. Separately specify where an NPC ghost exists, what summoning permits, embodiment/duration, retained relationships and a difficult ordinary revival loop. Coordinate property/background protection with PS rather than inventing a blanket building-protection rule or reopening permanent human death.

DG33's [selected NPC product proposal](../projects/extraordinary-minds-and-afterlife-feature-spec.md) now covers voluntary summoning, local manifestation, dormancy and finite-resource ordinary return through [BW15 children](base-world.md#dg33--voluntary-spirits-and-ordinary-revival). These proposed D15 mechanics require adoption and actual qualification. The unresolved human conflict/recovery choices above are not answered by an NPC ghost family.

**Selected first-playable contact/aftermath: Done — designed.** [RW](first-playable-roaming.md) supplies actual predator/rival travel and perceived camp contact, [CP](first-playable-cooperation.md) supplies voluntary ceasefire/withdrawal and private aftermath, [SV08](first-playable-survival.md#sv08--continue-after-early-death-loss-and-depletion) specifies recovery before the player owns a campfire, and [SH08/SH11](editable-shelters.md#sh08--natural-construction-rights-exact-contributions-and-exposure) specifies exact camp exposure and damaged-camp recovery. Their runtime/acceptance remains open. Remaining nonprojectile indirect harm, incapacitation/rescue and background-risk extensions beyond this selected camp exposure require their applicable BW14/MP/PS-D01 decisions. [DG33's NPC afterlife proposal](../projects/extraordinary-minds-and-afterlife-feature-spec.md) has separate BW15 adoption/delivery; creator revival and human recovery are not replaced. Sources: D07/D15 and current lifecycle/time owners.

### ND33 — Food freshness, spoilage and preservation

**Selected product proposal prepared; adoption and technical/stateful-material delivery open.** [Changing supplies](../projects/changing-supplies-feature-spec.md), [CS](changing-supplies.md) and its [profile](../worlds/base/changing-supplies.md) own attended food condition/preservation; renewal is independently selectable.

Preserve per-lot condition through aging, preparation, splitting/combining, transfer, save and absence; define recognizable safety/uncertainty, actual work/yields and interrupted/failed attempts. A current container organizes food but does not imply preservation. Sources: [survival](../worlds/base/survival.md), [items](../worlds/base/items.md), PO/BW/INV/time and [survival proposal](../../archive/03-design-proposals/survival-baseline.md). Detailed nutrition/microbiology are not prerequisites.

## Creation, controls and communication

### ND12 — Cross-world invention libraries and usable pack publishing

**Library/free-release product proposal prepared; technical delivery and broader rights decisions open.** Reuse [DG12's library journey](../projects/world-creation-feature-spec.md), INV-8/EWF11, [WC limits](../limits/world-creation.md) and [DG28 publication](../projects/published-packs-and-creator-revenue-feature-spec.md).

Define complete dependency inventories, retained attribution, private-origin metadata, destination bindings, allowed use/modification/redistribution, compatibility/refusal, updates/removal and access-ending behavior. Preserve accepted ownership/grants through the [invention-governance owner](../../archive/03-design-proposals/invention-governance-and-ownership.md) and [private-world policy](../../archive/06-marketing/open-platform-and-private-worlds.md). Cross-operator identity/disputes/synchronization and commercial rights retain D36/D43/D44; free reuse need not wait for payouts.

### ND13 — Stable action recommendations and complete control customization

**Combat-sensitive Command-click slice: Done — designed, October 17; implementation open.** The already delivered Command shortcut is the baseline. The [combat-response feature specification](../projects/combat-and-threat-responses-feature-spec.md) and [technical design](../projects/combat-and-threat-responses-tech-design.md) specify harmless selection, per-opponent current/recent evidence and own offensive intent, exact method/target preview, simulation-time grace, deliberate Speak/Stop controls, stable gestures and real recovery/staleness. [CTR02/CTR09/CTR10](combat-and-threat-responses.md) owns delivery; the [COMBAT ND13 synthesis](../../archive/02-research/game-inspiration/synthesis/combat-and-encounters.md#nd13--predictable-opponent-specific-quick-actions) owns its source discussion. Counting/ranking, revision grouping, arbitrary remapping and other device/input extensions below remain open.

**Current menu/shortcut slice delivered; recommendation and control extensions need scoped design.** Reuse [action discovery](../architecture.md#action-discovery-and-player-preferences), [PG03 evidence](../verification/player-clarity-ui.md), AC and UIUX. Preserve stable open menus, search/expanded identity, refreshed availability and existing pins.

Refine [counting/ranking and controls](../../archive/03-design-proposals/playability-and-controls.md): one count per authoritative committed execution, family/revision grouping, personal/world/global signals, windows/weights, NPC treatment and privacy. Define predictable changes, user control, remapping/conflicts/accessibility, device/world scope, stale bindings, nearby target stability, destination cancellation and text-focus isolation. F57/F58 and D46/D47 retain the direction; illustrative keys/counts are not adopted requirements.

### ND38 — Player skill during action execution

**Needs scoped design; not selected for implementation.** The [Sea of Stars PRESENT/COMBAT synthesis](../../archive/02-research/game-inspiration/synthesis/art-audio-and-game-feel.md#present-l003) makes a gap explicit between choosing an action and physically executing it. Existing action capability owners decide what can start and what the world actually does; ND13 owns shortcut/default controls; CTR owns the selected threat-response behavior. None currently owns a reusable product contract for optional human skill expression such as hold/release, aim/tracking, impact timing or directional defense after the player has selected an exact action.

A future design must begin with a concrete action where execution skill adds a worthwhile changing decision. Separate: (1) exact action/target/method selection; (2) character/world capability and native preparation; (3) the human input interaction; (4) trusted interpretation of that input into action-family-owned parameters; and (5) authoritative native contact/result/recovery. The engine may provide bounded input/presentation primitives, but the selected world/action family owns whether execution skill matters and what it means. NPCs must not simulate fake mouse timings; their competence continues through character/world mechanics.

The design must compare omission and assistance as first-class alternatives. Repeated timing that no longer changes a decision is a failure mode, not automatically “more real-time.” Accessibility, reduced-motion/precision assistance, keyboard/pointer/controller parity, input focus, interruption, stale target/method bindings, pause/simulation time, latency and recovery all need explicit behavior. Human-vs-human use additionally needs a selected client-trust/fairness boundary before execution quality can affect competitive outcomes; do not infer anti-cheat guarantees from browser timestamps.

**Recommended next design:** when selected, create the paired `action-execution-and-skill-expression` feature specification and technical design under `docs/projects/`, with AC/UIUX as shared owners and the affected world/action family as the semantic outcome owner. Start with one representative combat action and one materially different noncombat action so the mechanism cannot accidentally become a combat-only timing minigame. [PRESENT-L003](../../archive/02-research/game-inspiration/synthesis/art-audio-and-game-feel.md#present-l003), [COMBAT-L005](../../archive/02-research/game-inspiration/synthesis/combat-and-encounters.md#combat-l005), [action availability](../action-capabilities.md#action-availability-and-temporary-execution) and [UI essentials](../../.agents/rules/ui-ux.md) are the starting references.

**Illustrative action range, not a feature commitment:** drawing a bow against a moving target; blocking an axe with a readable windup; pulling a stubborn root from different soil with suitable leverage; casting a line into moving water; carefully hammering a fitted part; and balancing on uncertain footing. Each suggests different knowledge, physical causes and forms of control—aim and release, response to an observed attack, material resistance, water and line movement, tool contact and fit, or traction and support. Some may be more enjoyable as ordinary direct actions without any additional execution gesture. Do not reskin one timing circle for every activity. Compare the simplest useful action against the extra attention, feedback and outcome variation a skill interaction would add, both initially and after mastery. Where a gesture is selected, its effects must be grounded in the corresponding world/action mechanic rather than a parallel minigame score.

### ND14 — In-world remote messages and calls

**Text/contact and call product proposals prepared; adoption and technical delivery open.** [World text messages](../projects/world-text-messages-feature-spec.md) and [voice/calls](../projects/voice-and-calls-feature-spec.md) supply optional world affordances under NC22/NC23, MP/CR/data and their world profiles.

Complete addressing, consent, delivery/read distinctions, availability, blocking, retention and permitted knowledge; calls add media, interruption and missed/reconnect outcomes. Account metadata cannot grant fictional knowledge or unrelated conversations. Neither proposal equips the primitive start. Source: [remote-communication proposal](../../archive/03-design-proposals/world-and-player-experience.md).

### ND15 — Audible NPC dialogue, microphone input and proximity voice

**Product proposal prepared; D10/provider adoption and technical/media delivery open.** Reuse [voice/calls](../projects/voice-and-calls-feature-spec.md), HE07/NC23, [hearing](../hearing-and-speech.md) and current text-complete play. Research candidates are not chosen providers.

Preserve committed-word/transcript timing, partial listener eligibility, recognized identity, interruptions, permission denial, mute/revocation/reconnect, retention, rights and actual latency/cost across selected playback/dictation/raw-voice stages. Audience membership alone does not authorize a full utterance. Sources: [audio research](../../archive/02-research/engines-art-and-audio.md), [transport research](../../archive/02-research/hosting-and-scale.md), D10/R07 and HE/NC/MP/spending owners.

### ND16 — Hearing and communication beyond direct-path speech

**Selected ordinary-speech/social-perception and shared public-text streaming designs complete; broader extensions remain conditional.** Sources: [deliberate hearing extension boundaries](../hearing-and-speech.md#12-deliberate-extension-boundaries), [HE deferred expansion](hearing-and-speech.md#deferred-expansion), and [hearing limits](../limits/hearing-and-speech.md).

**Shared progressive NPC text — Done — designed, October 18, 2026.** Mike selected immediate display of approved accepted text for all public NPC dialogue. [The feature specification](../projects/npc-speech-streaming-feature-spec.md) and [technical design](../projects/npc-speech-streaming-tech-design.md) settle one authoritative append-only utterance, its fixed first-publication hearing/identity snapshot, durable prefixes, stable partial evidence, one terminal semantic opportunity, existing SSE fan-out and coherent caption/history/recovery behavior. [NST00](npc-speech-streaming.md#nst00--complete-the-selected-design-and-reconcile-owners) is done; NST01–NST10 own implementation and qualification. This overlapping NC19 public-text slice leaves the missing-design queue. No natural speaking pace, physical duration, moving hearing boundary, environment-driven interruption or audio is adopted. Broader ND16, DG26 and residual non-public NC19 caller work remain open under their existing owners.

**Existing coverage:** present hearing, recognition uncertainty and captions are specified. PS04/PS-D02 already own crowd competition, aggregate commotion, stable focus and the timing choice needed for overlapping speech; do not duplicate those tasks here.

**Selected SPK scope:** [the feature specification](../projects/speech-and-social-perception-feature-spec.md) and [technical design](../projects/speech-and-social-perception-tech-design.md) settle ambient speech or one optional addressee, unambiguous received addressing without sight but only through actual hearing, stable recognized identity with names separate, independent responses, and removal of ordinary Conversation joins/merges while preserving context/history. They also select native animal sound reactions independent of autobiographical memory, one player Speak/Speak-to/freeform Act gate when AI is unavailable, restrained recipient cues without a middle-dot separator, and full structured permitted experience through memory and consolidation with shared derived presentation. No semantic `replyTo`, replacement authoritative conversation graph, multi-addressee interface, optional voice service or new physics family is selected. [SPK](speech-and-social-perception.md) owns the sole delivery breakdown; this selected slice leaves the missing-design queue. Runtime, source/storage/UI cutover and qualification remain open.

**Overlap disposition:** DG02/CE consumes accurate social evidence and voluntary conduct; DG18 consumes membership-free actual-history reading. ND19/DG23 still owns subjective reinterpretation and dreams, while ND20/DG04 remains conditional retrieval research. ND14–ND15/DG24–DG26 retain their independent remote/media scopes, and ND17/DG25 retains its explicit correction relationship. None of those umbrellas is closed or silently enlarged by SPK.

**Still needed for further extensions:** select a concrete additional need such as rooms/portals, physical voice-familiarity analysis, language comprehension, amplification or sound-triggered waking. Define propagation or recognition inputs, partial/late listening where relevant, what the listener actually learns, native reactions and saved state. Establish bounded update/query work and meaningful scenarios. Frequency-level acoustics, lip-reading and other listed extensions remain options rather than one required simulation package.

**DG26 product disposition, October 8, 2026:** [The doorway consumer](../projects/voice-and-calls-feature-spec.md#8-the-selected-doorway-extension) starts with two current speech events around actual movement/door changes, then scopes genuine phrase-timed speech only with a qualified common mechanical pace. It adds no mandatory indirect propagation, waking, recognition or language system; PS04/HE07 retain the selected extension and its unperformed evidence.

### ND17 — Correcting speech that characters have already perceived

**Attributed-correction product proposal prepared; technical delivery open; administrative re-authoring remains a separate decision.** [DG25](../projects/corrections-and-shared-restoration-feature-spec.md) and HE06 select ordinary new attributed speech with an optional private own-history shortcut. Existing rejection of rewriting committed speech is not a hearing defect.

Broader D66 retcon or [creator memory-propagation tools](creator-edits.md) need explicit authority and dependent-evidence/consequence rules. Preserve actual listener fragments, recognized identity and source history; never reconstruct historical hearing from current positions or add legacy-event backfill. Sources: [hearing contract](../hearing-and-speech.md) and [D66](../../archive/05-project/open-decisions.md#d66--re-authoring-committed-speech).

### ND18 — First-encounter narration for places and inventory items

**Selected static-place/item design delivered; wider families need selection.** [PX03](parallel-batch-04-expeditions-and-exchange.md), [discovery evidence](../verification/useful-discoveries.md) and [the investigation](parallel-batch-08-the-missing-belonging.md) own private arrival/inspection evidence, useful deduplicated introductions, Known places and actual clue comparison.

Preserve permitted visible landmarks, exact inspected stock/definitions, last-known locations, source correction/forgetting and separately admitted movement. Possession or an outer bag does not disclose contents. Moving interiors, procedural regions, full maps and broader model-quality acceptance remain with NC/PO/SW and [spatial limits](../limits/spatial.md), not a replacement first-exposure design.

### ND34 — Additional distribution platforms and offline play

**Browser selected; additional platforms/offline deferred.** [DG35's decision brief](../projects/completed/platform-and-offline-decision-brief.md), SW10 and the [client replacement path](../spatial-world.md#client-replacement-path) retain alternatives. Current browser controls, hosting and minimum-device qualification remain open in their owners.

A new selected audience/production need must distinguish desktop packaging, replacement native/console client and offline simulation. Define controller/text/accessibility, accounts, suspend/reconnect, packaging/updates and qualification as applicable; offline separately needs a local host/provider policy. Compare equivalent play and maintenance cost before replacement. Source: [engine/distribution research](../../archive/02-research/engines-art-and-audio.md).

## Memory, shared history and advanced authored behavior

### ND19 — Older-memory transformation and dream reinterpretation

**Semantic product proposal prepared; adoption, technical delivery and quality evidence open.** [DG23](../projects/experience-shaped-characters-feature-spec.md), EC03/EC05/EC06 and [memory architecture](../memory-architecture.md) distinguish older interpretation and dreams from existing faithful consolidation/reflection.

Preserve actual witnessing, obligations, consequential distinctions, lineage, correction/forgetting and current-format restoration. Select eligible detail change, imagined/factual attribution, cadence and cost before implementation; no proposed weekly pass or lifetime expiry is a default. Sources: D14/D59/R11 and the [retention ledger](../../archive/07-technical-architecture/data-delivery-and-scale.md#retention-decision-ledger).

### ND20 — A bounded richer-memory retrieval comparison

**Conditional experiment; no new dependency selected.** SPK preserves structured sources and useful bounded exchange context through existing retrieval/compaction owners; it does not select this experiment, a new retrieval service or a semantic conversation graph. Source: [Hindsight evaluation](../../archive/02-research/hindsight-memory-evaluation.md), especially its recommendation, integration boundary, matched evaluation and resumption sections.

**Conditional experiment; no new dependency selected.** Establish a consequential repeatable omission before using the [Hindsight evaluation](../../archive/02-research/hindsight-memory-evaluation.md) to compare current recall, a modest native change and optional richer retrieval on matched histories.

CR12/CR13 and R11/R19 retain actor isolation, canonical-source mapping, eligibility, correction/forgetting/restore, fallback and total latency/cost. Use the smallest authorized investigator that answers the question; do not replace canonical memories or promise a deployment from research alone.

### ND21 — Mental effects, shared minds and selective telepathy

**Deliberate-telepathy product proposal prepared; broader families conditional.** [DG33](../projects/extraordinary-minds-and-afterlife-feature-spec.md) and EWF10T select chosen text between a willing known living pair with actual range/consent, local ending and protected derivatives. Adoption/technical delivery remain open.

Other [mental/shared-mind families](../../archive/07-technical-architecture/world-module-runtime.md) need actual targets, resistance, human control, conflict, lifetime and disclosure; shared minds additionally need membership/compartments, attribution, partial connectivity, departed-member memory and arbitration. Preserve target-owned changes and history; do not concatenate private minds or restore stale whole-goal snapshots on expiry. EWF10/INV/AG/CR/EPR/data remain the owners.

### ND35 — Shared-world restoration and private history

**Same-world shared/private-restore product proposal prepared; adoption and technical delivery open.** Reuse [DG25](../projects/corrections-and-shared-restoration-feature-spec.md), SL10 and [save/load](../save-and-load.md). PD06 operational recovery, invention portability and Journal export remain distinct.

Complete participant notice, pending commands/reconnect, coherent private cuts, erasure and current authority/accounting through existing roles. Private portable exports, alternate histories/branches/merge or cross-world effects require separate selected scope under D60/D48. No legacy-save support or creator-readable private history follows from this entry.

### ND36 — Optional narrative perspectives and distant-event cutaways

**Selected external-activity product proposal prepared; technical/disclosure delivery open.** [After you left](../projects/story-perspectives-feature-spec.md), NC20 and [narration limits](../limits/narration.md) own one voluntary human-only familiar-activity view in a private-world scope.

Qualify actual source/recipient authority, spoilers, preferences, correction/retention, revocation and bounded cost before enabling it. Human reading and character knowledge remain distinct. Private thoughts, other-human material and broader distant events require their own decisions under D57 and the [narration contract](../narration-and-conversations.md); ordinary discovery does not depend on them.

## Commercial service, creator ecosystem and launch learning

### ND22 — Commercial offers and the customer entitlement lifecycle

**Product and comparison preparation supplied; actual adoption and technical/payment delivery open.** [CO01's decision brief](../projects/initial-commercial-offer-decision-brief.md) compares credible browser offers. [Customer offers](../projects/customer-and-supporter-offers-feature-spec.md), [CO](commercial-offers.md), INV-13, PD10 and [billing/entitlements](../../archive/07-technical-architecture/billing-and-usage-reporting.md) own lifecycle and accounting.

Adopt actual offer, access/overlap, invention counting/revisions/bundles, units, any renewal/rollover, funding, cancellation/refund and fulfillment/reconciliation terms. Keep access, allowances, provider cost and optional art funding distinct. Additional character slots need switching/absence/funding scope and the RP05 embodiment decision before simultaneous control changes. Sources: [business plan](../../archive/06-marketing/business-plan.md), [creator economy](../../archive/06-marketing/creator-economy-and-mechanics-packs.md), D17/D35 and PS-D06 where applicable.

### ND23 — Creator revenue allocation and marketplace operation

**Product proposal prepared; actual commercial/rights adoption and financial-system delivery open.** Reuse [published packs and creator revenue](../projects/published-packs-and-creator-revenue-feature-spec.md), [PACK](published-packs-and-creator-revenue.md), ND12/INV-8/EWF11 and PD10.

Adopt qualifying participation, allocation, premium overlap, fees, eligibility, collaborator splits, fraud/refunds/reconciliation and continuing acquired rights. An exported pack does not resolve contracts or payees; illustrative values and [funding alternatives](../../archive/08-wellbeing-vision/13-money-and-mission.md) do not replace accepted membership direction. Sources: [creator economy](../../archive/06-marketing/creator-economy-and-mechanics-packs.md), [private-world policy](../../archive/06-marketing/open-platform-and-private-worlds.md), D35/D36/D43/D44.

### ND24 — Patron recognition, dedications and durable attribution

**Selected dedication product proposal prepared; venue/terms adoption and delivery open.** [Customer/supporter offers](../projects/customer-and-supporter-offers-feature-spec.md) and CO04 separate recurring benefits, one-time redemption, physical representation, possession and original historical attribution.

Adopt exact venue, naming/review/privacy consent, retry/restore-safe fulfillment, transfer/correction and retirement/remedy terms. Define any permanence promise precisely; a transferred object neither restores consumed naming rights nor rewrites the supporter. Broader packages remain optional. Source: [patrons and history](../../archive/06-marketing/patrons-contributors-and-world-history.md), D37; no token/NFT mechanism is required.

### ND25 — Creator grants and contributor/patron governance

**Conditional operating-program proposal prepared; actual adoption open.** [The fund proposal](../projects/creator-fund-and-contributor-governance-feature-spec.md), [FUND](creator-fund-and-contributor-governance.md) and [limits](../limits/creator-fund-and-contributor-governance.md) define a finite manual pilot with milestone/partial-work/cancellation, component rights, private evidence, conflict review and closure.

Select actual sustainable funding, eligibility, deliverables, agreements and advisory versus binding influence. A grant-specific standard is not a general creator mandate. Build grant/voting software only for an actual operating need; corporate mission structures, tokens and subscriptions do not create the program. Sources: D37, [patron/contributor proposals](../../archive/06-marketing/patrons-contributors-and-world-history.md) and [money/mission](../../archive/08-wellbeing-vision/13-money-and-mission.md).

### ND26 — A bounded commercial test and repeatable product demonstration

**Selected first-playable design and operational preparation: Done — designed; actual delivery, testing and offer execution open.** The [integrated feature specification](../projects/first-playable-world-feature-spec.md) and [technical design](../projects/first-playable-world-tech-design.md) settle the complete selected scenario and connect SV/SH/CP/RW dependencies. [FPV](first-playable-validation.md) and [the playtest plan](../projects/first-playable-playtest-plan.md) own build readiness, scoped sessions, recruitment, findings and iteration against the [world target](../worlds/base/playable-openings.md#first-playable-game-target). Reuse those designs rather than label allocated implementation or unrun player evidence as missing design.

Set actual operator/permission, time/spend, access/consent and decision criteria before dependent execution. Separate usability, enjoyment/voluntary return, broader demand and payment; partial sessions do not close the full target. [CO01/CO05](commercial-offers.md) owns adopted paid-offer testing; ten renewing customers applies only as an early recurring-offer milestone, not livelihood proof or a target for every product. Sources: [launch principles](../../archive/02-research/indie-launch-commercials/learnings.md), [business](../../archive/06-marketing/business-plan.md), [channels](../../archive/06-marketing/ideas-channels-and-experiments.md) and [positioning](../../archive/06-marketing/positioning-and-copy.md).

### ND37 — Public-world reporting, participation controls and operator authority

**Public-service decisions and scoped design required.** Reuse PD08/PD10, MP/data accounts/grants/private projections, D21/D48 and the [human-private boundary](../../archive/07-technical-architecture/data-queries-and-mcp.md#human-private-content-boundary).

Select reporting/enforcement, control scope/duration, creator versus separately authorized operator powers, private evidence/retention, outcome communication, mistake review and revocation/reconnect. Creator status grants no human-private access. Fictional institutions and optional well-being conduct are not this public-service policy and do not confer powers.

## Optional well-being and real-world value

The [well-being vision](../../archive/08-wellbeing-vision/README.md) is optional ideation. Selecting a specific consumer does not adopt its entire charter, interventions, numerical targets or release gates.

### ND27 — Resident conduct, audience and sensitive-conversation policy

**Adult audience resolved; remaining adopted-service conduct needs decisions/design.** NC/CR owns conversation and authorized memory correction/forgetting; PD07/PD10 owns model/service boundaries. ND37 separately owns public enforcement.

Select official behavior versus authored fiction, real-life conversation boundaries, human/AI disclosure, farewells, dependency/commercial-message policies and any crisis/operator experience. Optional resident-memory controls must protect shared/other-human privacy; model/prompt continuity needs explicit preserved identity and evidence. Do not import archive romance rules or audit thresholds automatically. Sources: [resident proposals](../../archive/08-wellbeing-vision/04-ideas-residents-who-point-outward.md), [guardrails](../../archive/08-wellbeing-vision/11-guardrails-risks-and-law.md), [questions](../../archive/08-wellbeing-vision/14-questions-and-first-experiments.md), D16/D21.

### ND28 — Optional session endings, play rhythms and returning experience

**Conditional product experiment.** Choose a skippable closing/return experience, personal preferences and any selected notification/digest; measure usefulness and preserve opt-out. NC/MP supplies current narration/absence, while PS owns any actual new clock/protection rules.

Separate personal presentation from other people's continuing simulation; a friendly ending is not a global pause or compulsory intervention. Sources: [rhythm/rest/return](../../archive/08-wellbeing-vision/03-ideas-rhythm-rest-and-return.md), [top picks](../../archive/08-wellbeing-vision/00-top-picks.md) and E2/E3/E5 in [experiments](../../archive/08-wellbeing-vision/14-questions-and-first-experiments.md).

### ND29 — Measure whether play supports well-being and human connection

**Optional product proposal prepared; study adoption and technical/operational work open.** Reuse [the connection-study proposal](../projects/wellbeing-evidence-feature-spec.md) and [WBE](wellbeing-evidence.md), separately from ordinary game/performance/cost evaluation.

Select the actual objective/question, comparison, sampling, minimal opt-in data, retention/withdrawal and identity/private-conversation separation. State self-report/selection limits, partner/reporting choices and the smallest needed instrumentation. Proposed scales are not player scores or evidence of health benefit. Sources: [measurement](../../archive/08-wellbeing-vision/12-measuring-what-matters.md), Q1/Q11/E6 in [questions/experiments](../../archive/08-wellbeing-vision/14-questions-and-first-experiments.md).

### ND30 — Personal journal extensions and exported or printed editions

**Narrow personal-edition product proposal prepared; technical delivery open; wider editions conditional.** [Personal Journal](../projects/personal-journal-feature-spec.md) and NC21 reuse NC07–NC12's grounded storage/generation/UI rather than rebuild it.

Select useful permitted entries/interpretation, exact output, correction/erasure and accessibility. Saved resumption, art, real-life anchors, printing and shared/family editions need their own use/rights/consent decisions and need not gate a narrow edition. A Journal export grants no full-world/private-history export or new sunset promise. Sources: [Legenda/top picks](../../archive/08-wellbeing-vision/00-top-picks.md), [growth/meaning](../../archive/08-wellbeing-vision/07-ideas-growth-and-real-goals.md) and [privacy](../../archive/08-wellbeing-vision/11-guardrails-risks-and-law.md).

### ND31 — Human introductions, small groups and family participation

**Conditional product pilot.** Select a mutually accepted introduction, recurring group or family journey using current multiplayer/invitations. Specify discoverability/contact consent, resident disclosure, human attribution/handoff, scheduling, opt-out and problem handling; new public access consumes D68/PD.

Real-world venues need selected partners/processes and an accessible remote alternative. No civic/family-world example automatically becomes a platform commitment. Sources: [resident connectors](../../archive/08-wellbeing-vision/04-ideas-residents-who-point-outward.md), [together](../../archive/08-wellbeing-vision/05-ideas-together.md) and E10 in [experiments](../../archive/08-wellbeing-vision/14-questions-and-first-experiments.md).

### ND32 — Learning, creation and other uses beyond the game

**Conditional discovery/experiment under D25/R16.** Select one actual learning, craft, communication/language rehearsal, writing, agent-evaluation or external-developer problem. Existing invention/knowledge/teaching does not establish transfer or demand.

Test a useful bounded outcome with feedback/debrief or trustworthy scoring, source/content/partner rights, accessibility and relevant real-world responsibilities. Decide whether it belongs in this game, a creator world or a separate supported offer. Internal packages do not establish a need for a general SDK or clinical/training product. Sources: [beyond-game ideas](../../archive/04-ideation/business-and-future-directions.md), [hands/body/nature](../../archive/08-wellbeing-vision/06-ideas-hands-body-and-nature.md) and [growth/goals](../../archive/08-wellbeing-vision/07-ideas-growth-and-real-goals.md).

## Existing designs and deliberate deferrals to reuse

**Shared network request lifetimes: Done — designed.** The [feature specification](../projects/completed/bounded-network-requests-feature-spec.md) and [technical design](../projects/completed/bounded-network-requests-tech-design.md) define finite waiting despite ignored cancellation, bounded unsettled work, preserved remote-outcome uncertainty and continuous-stream ownership. [NET01–NET11](bounded-network-requests.md) owns implementation and qualification. This completes the selected cross-cutting design; it does not close an ND umbrella, certify deployed network behavior or replace AI, asset, identity and production release gates.

| Area                             | Existing owner and remaining boundary                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Art/appearances                  | [Art pipeline](../invention-art-pipeline.md), [3D feature spec](../projects/3d-pixel-art-feature-spec.md), [technical design](../projects/3d-pixel-art-tech-design.md), [V3D](3d-pixel-art.md), INV-12/INV-14 and [art studies](art-direction.md). Pilot evidence is distinct from broader style/provider/rights, asset cost, review and device qualification.                                                                                                         |
| Time/locality                    | [Simulation time](simulation-time.md), [boundaries](simulation-boundaries.md), [proportional work](../projects/proportional-step-work.md), PF/EPR/SW. Reuse scheduler/family designs; product-resolution choices stay with PS.                                                                                                                                                                                                                                         |
| Hosting/authentication           | [PD](production-deployment.md), [Auth0 plan](../projects/auth0-sign-in.md), [production data](production-data.md) and [MP](multiplayer.md). ND02/ND37 supplies selected entry/enforcement decisions, not replacement infrastructure.                                                                                                                                                                                                                                   |
| Persistence/queries              | [Technical architecture](../../archive/07-technical-architecture/README.md), data/PF/PD and [save/load](save-and-load.md). Current PostgreSQL/scoped HTTP/SSE and PD06 recovery remain controlling; ND35 is a separate shared-gameplay extension.                                                                                                                                                                                                                      |
| Agency/teaching                  | [AG](agent-agency.md), [CR/CH](cognition-redesign.md), INV-4/INV-7 and [NP](parallel-batch-02-foundations-and-usability.md). Reuse pursuits/tools/knowledge; progression and real-world value are distinct consumers.                                                                                                                                                                                                                                                  |
| Conversation memory              | [Compaction feature spec](../projects/completed/conversation-compaction-feature-spec.md), [technical design](../projects/completed/conversation-compaction-tech-design.md) and NC14–NC18. [SPK](speech-and-social-perception.md) replaces mandatory social membership while preserving bounded source-linked history and structured evidence; it selects no semantic reply graph. NC12 retains broader qualification and NC18 conditional richer-state/retrieval work. |
| Survival/actions/state           | [AE](action-experience.md), [BW](base-world.md), [SC](state-contributions.md), [DI](dependency-invalidation.md) and existing PW/NP batches. Keep delivery and acceptance with their owners.                                                                                                                                                                                                                                                                            |
| Family facts/promises            | BW16/BW17, D63/D64 and [ACT](actor-model.md). Objective creator inspection, memory-based learning and promise changes have existing owners; selected new vocabulary/processes need their own scope.                                                                                                                                                                                                                                                                    |
| Reviewed content removal         | [Batch 09 technical design](../projects/completed/parallel-batch-09-reviewed-content-removal-tech-design.md), [RD](parallel-batch-09-reviewed-content-removal.md) and [creator edits](creator-edits.md). Reuse selected condition-removal design/evidence; broad definition/stock retirement and memory propagation are separate.                                                                                                                                      |
| AI execution                     | [Provider contract](../ai-providers.md), [MW](macrofold-worker-api.md), [World Agent writes](world-agent-writes.md), R19/R20. Existing migration/authoring owners retain delivery; comparative hosting research is not another game prerequisite.                                                                                                                                                                                                                      |
| Executable algorithms            | INV-8.4/EWF10, D20/R05. Conditional on an actual mechanic unsupported by declarative composition, with a selected isolation design; no generic sandbox project.                                                                                                                                                                                                                                                                                                        |
| Alternate scale/world strategies | [Scalability alternatives](../product-scalability/alternatives.md) retain explicit triggers for seamless geography, time dilation, isolated rollback, chapter worlds and reenactments.                                                                                                                                                                                                                                                                                 |
| Tokens/corporate mission         | D38, [funding exploration](../../archive/06-marketing/tokens-and-community-funding.md) and [money/mission](../../archive/08-wellbeing-vision/13-money-and-mission.md). Unselected; ordinary entitlement/fund work need not adopt them.                                                                                                                                                                                                                                 |

## Source authority

[Production workflows](../production-workflows/README.md) connect the existing art studies and V3D/INV delivery owners to in-game review. Source rights, useful-asset cost, human review and device qualification remain with those owners.

Use canonical contracts and the actual selected revision's project/tracker evidence over broad statements in older proposals. Research and examples inform selection; they do not adopt features or waive acceptance. [Development save policy](../../AGENTS.md#development-save-policy), privacy/authority and existing verification requirements remain controlling for every selected extension.
