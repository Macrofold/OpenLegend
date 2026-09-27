# AI Dungeon — co-authoring a story is not the same as governing a world

**G40 · Full research pass · September 26, 2026.** Current web/mobile documentation, historical AI Dungeon 2 criticism, the retired Steam release and the separate Voyage product remain distinct. R01–R14 coverage and evidence limits are mapped below. No gameplay session, script execution or video playback was conducted.

[Earlier chapter](../games/ai-dungeon.md) · [Preserved shared study](../mechanics/scribblenauts-ai-dungeon-language-intent-and-consequence.md) · [Progress](../research-progress.md) · [Roster](../research-roster.md)

The complete earlier chapter and shared mechanics study were read and remain unchanged. This pass preserves their Do/Say/Story examples, context-entry timing, July 2026 shopping-scene complaint, earlier App Store accounts and historical Vinny viewing route. New documentation qualifies older claims without silently rewriting their source context. All Scribblenauts material in the shared owner is untouched.

## 1. Identity, versions and the player promise

AI Dungeon is Latitude's text-first roleplaying and collaborative-storytelling product. A player selects or creates a premise, contributes an action or narrative passage, reads a generated continuation, and either builds on it or changes it. The important freedom is to pursue ideas outside a fixed authored command tree; the important qualification is that a convincing continuation is not proof of an independently resolved game rule. The official controls explicitly support both acting and rewriting. [P2]

There is no single campaign that defines all adventures. A fantasy expedition, science-fiction mystery, romance and mundane conversation can share the interface while setting very different expectations. **Interpretation:** one player wants an unexpected writing partner; another wants a referee who remembers commitments and resists impossible actions. The same permissive response can delight the first and disappoint the second. This is a difference in the promised activity, not merely a difference in prose quality.

| Studied scope | Boundary |
| --- | --- |
| **2019 prototype and AI Dungeon 2** | Historical early-generation design, distribution and criticism. The early choice-list prototype and subsequent free-form input are not the current model selector. [D1] [D2] |
| **Current web/mobile AI Dungeon** | Adventures, reusable Scenarios, authoring controls, contextual memory, model choices, image generation, scripting and native shared play are documented below. Official descriptions establish intended capabilities, not a reproduced quality benchmark. |
| **Steam release** | Latitude says the app was retired in early 2024. That distribution retirement does not mean AI Dungeon as a whole closed. Old Steam pricing/reviews remain historical evidence. [P1] |
| **Voyage** | The official memory explanation explicitly contrasts Voyage's tracked health, inventory, quests and levels with AI Dungeon's storytelling emphasis. Do not import those systems into this dossier's base-game inventory. [P4] |
| **Creator scripts** | Optional scenario scripts can maintain structured state. Consequently, neither “all AI Dungeon has enforced RPG rules” nor “AI Dungeon can never maintain state” is accurate. A particular script needs its own inspection and tests. [P7] |

The live model guide also distinguishes named models from **Dynamic Small**, a routing option whose selected underlying model may vary. Its descriptions position **Muse** toward emotionally detailed character interaction and **Wayfarer Small 2** toward conflict and consequences. These are developer-stated tendencies, not proof of comparative quality or a mechanically enforced difficulty mode. Settings available on one model may not exist on another. [P13]

## 2. What the player actually does

### The action and authorship loop

**Do** frames an attempted character action; **Say** frames dialogue; **Story** directly contributes narration. **Continue** asks for more output without another explicit action. **Edit** changes prior text; **Retry** supplies alternate continuations in a selectable stack; **Erase**, **Undo** and **Redo** change the retained sequence. Undo history is session-limited: refreshing is not equivalent to preserving an unlimited undo stack. See mode is an additional image workflow, covered separately. [P2]

**Interpretation:** this is a loop of proposal, continuation and selection. The participant may alternate between protagonist, editor and scenario author. That is a legitimate form of play, but the interface should not imply that those roles carry identical authority. Selecting a better paragraph is different from successfully persuading a resistant character under stable rules.

### Whole-game mechanics inventory

The table identifies the researched base experience. “Narrative” does not mean unimportant; it means that a concept is represented in the fiction rather than established here as a universal native subsystem. Optional scripts can change these boundaries.

| Category | Actual activity and useful limitation |
| --- | --- |
| **Identity, classes and origins** | Choose a premise and character details. Character Creator scenarios can offer classes, races, starting locations and factions through their authored options. These choices initialize fiction; they are not evidence of one global balanced class roster. [P6] |
| **Attributes, skills, perks and leveling** | Describe competence and desired growth in the premise or contextual components. AI Dungeon's base storytelling memory is not the separate tracked-level system documented for Voyage. Creator-maintained rules must be attributed to that scenario, not the platform generally. [P4] [P12] |
| **Items, inventory, weapons and armor** | Carry, describe, request, give or lose things through narrative actions. An author can preserve an important possession in Plot Essentials; that is different from proving an enforced equipment slot, weight limit or damage calculation. [P10] |
| **Crafting, upgrades, magic and powers** | Propose making or transforming something, then respond to the continuation. The story can contain ingredients, spells and restrictions. Whether they constrain future actions depends on the actual scenario and implementation; section 7 contrasts a transformation failure with a creator's resource quest. |
| **Traversal, maps and environment** | Describe travel, investigation, opening a door, changing location or passing time. Places are authored/generated story context, not a universally documented coordinate map, collision system or simulated geography. The repair tools remain available when continuity fails. [P9] |
| **Combat, stealth and looting** | Attempt an attack, concealment or search through the same narrative interface. No universal initiative order, loot table, health arithmetic or detection formula was established for ordinary unscripted Adventures. The presence of a sword or guard in prose does not establish one. |
| **Quests, events and activities** | Pursue a scenario's goal, invent another, investigate a surprise, or treat dialogue itself as the activity. A puzzle, meal, performance or battle can become a scene without a dedicated platform-wide minigame. [P8] [P9] |
| **Relationships, romance and companions** | Supply personalities, history and relationships, then converse or act around them. Recurring companions and factions can be contextual entries; this is not proof of independently scheduled agents or universally tracked affinity meters. [P3] [P10] |
| **Trade, settlements and management** | A story can contain shops, currencies, buildings and institutions. Do not confuse fictional prices with paid account Credits or infer a persistent market simulation from a described transaction. Scripted management scenarios need separate qualification. |
| **Failure, death and recovery** | A story may narrate defeat or death, but the authoring interface permits revising its continuation. Service errors, forgotten context and unwanted narration are technical/interaction failures, not automatically fictional punishment. [P2] [P9] |
| **Multiplayer** | People contribute to a shared Adventure under the host's model/settings arrangement. This is documented native collaborative storytelling, not evidence of a competitive MMO economy or tamper-proof combat resolution. [P5] |
| **Return play and creation** | Resume an Adventure, start another from a reusable Scenario, refine contextual materials, share a premise, or improve a script. The durable creative artifacts differ from a character's fictional loot. [P8] [P7] |

The unsupported-subsystem distinctions above are an analytical reading of the documented interaction contract, not a claim to have audited every community scenario. An implementation might enforce a rule; a persuasive statement that it does so is not enough to establish how it works.

## 3. Scenarios, Adventures and reusable creations

A **Scenario** is a reusable starting configuration; an **Adventure** is an individual playthrough. Scenario creation includes the opening and supporting components, while title, description and tags help people find and understand the premise. For ordinary story scenarios, a public-facing description is not itself the text sent to the model. Character Creator has its own documented description/entry behavior. Publishing and later editing a draft are also distinct operations. [P8] [P6]

Character Creator, formerly associated with Worlds, lets an author provide structured starting choices and generate a new opening. The official guide's examples include WanderingStar's **Faerûn**, OnyxFlame's **Fiomar** and AI Dungeon's **Kedar**. Their inclusion is a navigation example, not a claim that every world was played here or a proposal to copy their names/assets. Quickstart can produce combinations requiring author attention; a menu choice does not independently validate all fictional compatibility rules. [P6]

An Adventure accumulates the actual exchange and can be continued or edited. It is therefore useful to distinguish four artifacts: the reusable premise, a particular story history, supporting world/character notes, and any script state. **Interpretation:** restoring one without the others can change the experience. A downloaded transcript is valuable preservation, but not automatically a portable running game with identical models and behavior. [P9] [P7]

### Context tools are different jobs, not interchangeable storage boxes

| Tool | Documented role and limitation |
| --- | --- |
| **AI Instructions** | Directions about how to produce the response, placed early in the supplied context. They influence narration; they are not a native action validator. [P12] |
| **Plot Essentials** | Recurring facts relevant across turns, such as identity, companions and an ongoing goal. Concise facts preserve room for story; wording an old event as present can encourage its reappearance. [P10] |
| **Author's Note** | Brief guidance on genre, tone and writing style, placed near the end of context. It is not the best place to dump an entire setting encyclopedia. [P11] |
| **Story Cards** | Triggered entries about people, places or concepts. Entry is the story-context field; Name and Notes are not normally sent as lore. A keyword first generated in an output can only supply its card to a subsequent generation. [P3] |
| **Story Summary** | A compressed account of earlier events, with manual and automatic workflows. Editing earlier story text does not automatically rebuild all summary history. [P4] |
| **Memory Bank** | Automatically stores summarized events and retrieves relevant memories, using similarity and limited context. Storage and retrieval are separate from whether the model uses the information correctly. [P4] |
| **Context inspection** | Shows what was actually supplied and warns when components do not fit. It helps distinguish a missing fact from a fact that was supplied but not followed. [P18] |

Cards can be edited, imported and exported, with browser-specific management boundaries. Literal trigger behavior and limited context matter: a large saved library does not mean every entry participates in every continuation. [P3] **Interpretation:** a reliable creator workflow needs to distinguish saved information, selected information, presented information and behavior. More prose in a database solves only the first problem.

### Optional scripting

The documented script lifecycle provides **Library, Input, Context and Output** roles. A persistent `state` object is available across turns of an Adventure, and scripts can interact with story-card data. Scenario scripts are shared with their resulting Adventures while each Adventure maintains its own state. The inspected API documentation also describes execution limits; this is not an unrestricted general-purpose hosted server. [P7]

**Interpretation:** a script can make progression more explicit, but correct world rules still depend on its design. Updating a “machine repaired” flag after recognizing a phrase does not establish that inventory acquisition, consumption, retries and concurrent player actions were all validated. This pass does not execute or certify any community script, and does not assume that the platform provides transactional world semantics around it.

## 4. Progression, time, scarcity and failure

**First session:** choose a premise, establish who is acting, and discover the difference between contributing an action and authoring an outcome. **Established play:** sustain characters and goals, decide which surprises to accept, and maintain relevant context. **Long-running play:** return to an unresolved plot, refine a reusable scenario, explore alternate directions or share the creative setup. These are an analytical description of the documented Scenario/Adventure loop, not a fixed sequence of campaign unlocks. [P8] [P9]

The player's increasing skill is partly expressive and editorial: giving enough direction without overconstraining the response, recognizing continuity failures, and selecting the right context tool. The lasting reward may be a memorable scene or a useful scenario rather than a higher stat. **Counterpoint:** an audience seeking earned mastery can reasonably find unlimited editorial repair unsatisfying. A writing tool does not become a better writing tool merely by making correction punitive.

Fictional death, a failed objective, a discarded paragraph, loss of an account artifact and a generation error are different failure modes. Their recovery rules should not be collapsed into “permadeath.” For example, fixing historical text can leave its summary inconsistent; section 7 gives a documented-workflow illustration. [P4]

Model settings affect pacing and variability. Response length changes how much the player reads before acting again; context length limits the supplied material. Temperature, sampling controls and repetition penalties change generation behavior, with model-dependent availability. They are not difficulty sliders with a guaranteed relationship to challenge, and increasing context is not proof of better dramatic pacing. [P14]

### Fictional resources versus paid resources

**Credits** support paid service consumption, including image generation and extended context on applicable models. Subscription bundles and optional additional purchases are documented. Extended-context costs can recur on turns and retries; a rejected paragraph need not mean no compute was consumed. The exact applicable model/tier price must be checked in the live selector rather than reconstructed from an old example. [P16]

**Scales** are a separate reward/tipping resource. The inspected guide describes daily rewards, creator tips and free-model speed boosts. It does not establish a cash-out income stream for creators. Its “up to” speed claim is a developer offer, not a measured latency result here. [P17]

**Interpretation:** these currencies should not be mistaken for a character's gold, mana or crafting materials. Charging for a retry also creates a design tension: a creative alternate take and a repair of clearly unwanted output can feel like different kinds of consumption even when both require generation. That is a product question, not evidence of a particular retention or profitability outcome.

## 5. Characters, social play and narrative meaning

A character can feel distinctive through remembered relationships, characteristic language and repeated situations, without having an autonomous daily schedule. Story Cards and Plot Essentials supply tools for that continuity; they do not demonstrate an independent mind with knowledge isolated from the narrator. **Interpretation:** a betrayal matters because earlier exchanges made a promise meaningful. If a later paragraph casually changes the relationship, the emotional cost can exceed the cost of forgetting a minor object. [P3] [P10]

There is no mandatory spoiler-bearing main plot. The named characters in section 7 belong to attributed generated playthroughs rather than shared canonical quest lines. The same applies to a user-created romance, party, faction or settlement. Their significance comes from the particular evolving story; they are not automatically platform-wide reputation mechanics.

In native multiplayer, the host shares an **eight-digit join code** and controls the relevant model/premium arrangement; other players do not all need the same paid membership. Character names support third-person actions. A kick and a block have different re-entry behavior. Returning to Home can retain participation, whereas leaving the Adventure requires joining again. The documentation's four-player indicator is not stated as a hard capacity limit. [P5]

**Interpretation:** the group's coordination problem includes agreeing on tone, ownership of characters and when correction is appropriate. Shared access to a narrator is not the same as private information channels, adversarial fairness or persistent off-screen actors. Those features would need separate evidence. A collaborative group may prefer easy repair rather than the restrictions appropriate to a competitive game.

Public creative participation also has a different unit of contribution: a starting scenario can be replayed by strangers, while an Adventure shares what happened to particular participants. Cover images and descriptions help set expectations. The current interface distinguishes Private, Unlisted and Published visibility; a visibility control is not itself proof that the service never processes the underlying text. [P18]

## 6. Presentation, interface, accessibility and trust

Text carries the setting, action and much of the emotional feedback. **Interpretation:** the central readability question is not a creature's combat silhouette but who acted, who spoke, what changed and which passage is being revised. Too much automatic continuation can take the decision away from the player just as surely as too little can leave them with a blank page.

Current appearance documentation includes dynamic backgrounds informed by story imagery, styled themes such as **Orcish, Atlantis and Cyber**, high contrast, selectable text styles and larger text. Text animation can be disabled; sticky input and compact controls trade discoverability against screen space. Those documented options qualify historical complaints about slowly appearing text, without proving that every historical issue is resolved on every device. [P18]

**See mode** adds generated images to an Adventure. A supplied prompt directs the image; a blank prompt can draw on recent actions and contextual material. The image can be shared, revised or retried, with applicable costs and deletion limits. The guide's style and composition advice is an authoring vocabulary, not evidence of a fixed art direction or frame-by-frame world renderer. [P15]

**Interpretation:** an evocative portrait or place image can help a story feel concrete, while a contradictory image can undermine continuity. A generated illustration should not silently become stronger evidence of world state than the story it accompanies. This is an inspiration risk to examine, not a tested defect of the current image models.

Audio research did not establish a current native narration/voice feature or a documented authored soundtrack. Voice was discussed as a future direction in the January 2020 developer interview; that is not delivery evidence. No audio or video was played in this pass. The text-first experience therefore receives the substantive presentation treatment above rather than an invented music-production account. [D1]

The current US App Store page lists English and does not declare supported accessibility features in its accessibility section. That omission is not proof that screen readers fail. No assistive-technology test was conducted, and model language ability is distinct from interface localization. Device-specific player reports below are not universal accessibility findings. [U2]

### Governance and privacy are part of the experience

Alex Mitchell's January 2022 critical account discusses the April 2021 filtering controversy and the gap between an unrestricted creative promise and users encountering unexpected restrictions. It attributes complaints about false positives and cites Latitude's acknowledgment of inadequate advance communication. This is historical reception evidence, not a finding that the current filter behaves identically. The linked original company post now returned no readable body. [R8]

The privacy page retrieved in this pass displays **September 25, 2023** as its revision date and describes account/usage collection, provider sharing and public user-generated content. It is not a blanket promise that private stories never leave the service. Because policy surfaces and product settings can differ over time, this dossier makes no comprehensive legal/privacy-compliance claim and does not adopt a competitor review's broader assurances. [P19]

**Interpretation:** visibility, moderation, model refusals, experimental data use and narrative constraints should be explained separately. A player should be able to tell whether a story choice failed inside the fiction, a model declined it, or a product rule intervened. This is especially important when the interface also invites deeply personal authorship.

## 7. Eight concrete situations

These span story improvisation, continuity, context maintenance, creator rules and group participation. Actual play belongs to the named sources. Constructed examples illustrate documented workflows and are not reproduced tests.

### A. Transform the guard, not the protagonist

**Intention:** Bartneck's character attempts to turn a guard into a chicken. **Condition:** his science-fiction setup includes the android Paco, corporate force Zail and a laser pistol/holoband. **Reported outcome:** the transformation affects the protagonist, while the scene also drifts toward an office and coop. **Next decision:** correct the fiction or accept a substantially different premise. This preserves the original reflection's common-sense complaint without treating its unspecified model/settings as a current benchmark. [R5]

### B. Survive a crash without changing who witnessed it

Grannell describes a helicopter/crash sequence in which the continuation confuses the participant's relationship to the event. **Intention:** act within an unfolding adventure. **Interaction:** the next passage remains locally vivid while changing the implied situation. **Next decision:** repair identity/location or pursue the new branch. **Interpretation:** sentence-level fluency and continuity of the player's role are different qualities. This is a historical reported incident, not reproduced play. [R2]

### C. A detour becomes the story

Lamerichs's zombie-war adventure unexpectedly relocates the protagonist and supplies a marriage to **Bob**; she then develops the family/zombie aftermath through continued contributions and revision. **Intention:** pursue one premise. **Result:** an unplanned development becomes material for another. **Next decision:** curate the surprise rather than reject every deviation. Her essay describes co-creation; it does not establish that each interaction retrained the underlying model. [R3]

### D. Discover responsibility for the ruined place

In Macgregor's December 2019 account, a wizard investigating ruins discovers his own connection to their destruction and confronts a younger version of himself within a short exchange. **Intention:** investigate an evocative setting. **Result:** a personal mystery emerges without a prewritten quest branch documented in the report. **Next decision:** respond to that revelation. The same article notes loops and instability; this successful surprise does not establish reliable long-form plot planning. [R7]

### E. Put the secret in the field the story actually receives

**Constructed workflow:** an author stores a guard's allegiance only in a card's Notes, expecting it to govern a later encounter. Notes are not normal story context, and a trigger first appearing in an output cannot retroactively inform that same output. **Next decision:** place relevant lore in Entry, ensure it can be selected, and inspect what was supplied. That repairs a field/timing mistake without guaranteeing that the model will faithfully use the fact. [P3]

### F. Correct a death without leaving it in the summary

**Constructed workflow:** a player edits an earlier passage so a companion survives. The automatic memory documentation says old edits do not automatically regenerate the full summary. **Potential interaction:** the story history and summary can now disagree. **Next decision:** update the summary as well, then check the continuation. This example illustrates consistency between authoring artifacts; it is not a demonstrated character-resurrection mechanic with validated inventory rollback. [P4]

### G. Three ingredients do not guarantee a satisfying quest

DreamGen's competitor-published test creates a **Ruza Archipelago** repair quest involving **Redstone, Aqua Vitae and Orichalcum** for a broken **Timespace Machine**. Its reported continuation makes the search too straightforward, while a script updates contextual machine status. **Next decision:** redesign the challenge or accept a more permissive writing experience. The article's claim that the script prevents cheating is not adopted as proof of enforced acquisition/consumption; its code was not executed here. [R6]

### H. Invite a friend without duplicating the host's purchase

**Constructed workflow:** a subscribed host starts a shared Adventure and distributes the documented code. A joining friend uses the host's model arrangement and a named third-person character. **Next decision:** agree how the group handles narration and corrections; use the appropriate leave/kick/block behavior when participation changes. This illustrates documented access and continuity, not a tested concurrent combat or secret-information protocol. [P5]

## 8. Production, distribution and commercial context

John Harris's January 9, 2020 interview traces Nick Walton's hackathon experiment, early release and transition to hosted web/mobile access. It identifies collaboration on the mobile and infrastructure work and describes input/output cleanup around the generator. Community help distributing the large model was part of the early access story. Voice, imagery and multiplayer discussed there were still future directions at that moment; current delivery needs the separate documentation cited above. [D1]

Latitude's February 11, 2020 scaling account distinguishes the first choice-list prototype from later free-form input. It reports attention from Hacker News, video playthroughs and shared screenshots, then a move away from repeated large model downloads toward hosted inference. Its discussion of infrastructure and cost optimization is company testimony, not an independent cost audit. [D2]

**Interpretation:** distribution and play quality were coupled. A remarkable story screenshot could attract another player, but the new player still needed an accessible, responsive session. A lower-friction hosted service also brings continuing inference and support obligations; viral interest alone does not establish that those obligations are economically sustainable.

The later product sequence includes the paid Steam release, changed free-access economics, the retirement of that client, and continued work on contextual memory, model selection and creator tools. The present model guide's mixture of named models and dynamic routing makes “AI Dungeon's AI” an insufficient version identifier for a reproducible review. A useful comparison records model, tier, configuration, scenario and date. [P1] [P13]

| Dated evidence | What it establishes—and does not |
| --- | --- |
| **February 11, 2020:** Latitude reports more than one million users and six million unique stories. [D2] | Historical company-reported participation, not current monthly active users, subscribers, unit sales or profit. |
| **July 2022:** Steam launched with a $30 Traveler offer; the current FAQ describes subsequent free unlimited access after cost reductions. [P1] | A historical access/pricing transition, not today's premium model price. |
| **September 2023 / early 2024:** the later $10 Traveler purchase route ended, then the Steam app was retired. [P1] | Discontinued offers/client support, not disappearance of the browser/mobile service. |
| **Current retrieval:** the US mobile listing advertises free play without ads and optional purchases. [U2] | Current positioning; not an independent measurement of every user's entitlement, bill or latency. |
| **Current documentation:** subscriptions, Credits and Scales support different access/consumption/reward functions. [P16] [P17] | A service business model. No creator cash-out, revenue multiple or profit margin is inferred. |

The original company ads-retrospective and December 2022 Unchained announcement were located, but their current pages returned no readable article bodies. This pass does not pretend to have freshly verified their full causal or numerical accounts. Historical energy/advertising descriptions in old criticism should not become current restrictions.

Current revenue, profitability, retention, acquisition spending and subscriber totals were not established. Missing private numbers are not evidence of failure. Sharing a surprising scene, a reusable scenario and a creator's instructions/scripts are plausible distribution units; no measured channel-attribution percentage is claimed. The useful commercial lesson is the documented coupling of access costs, product packaging and continued operation, not an invented financial verdict.

## 9. Written criticism and player feedback

The reception pass reads beyond scores. Five substantial independent-source accounts anchor the discussion: two conventional reviews, a first-person creative-writing critique, the Ars group play report, and Mitchell's academic critical treatment. Bartneck's shorter transcript reflection, Macgregor's early hands-on report and a clearly identified competitor review add distinct evidence. They are not mislabeled as eight scored professional reviews of one current build.

| Author, source and date | Specific praise, criticism and boundary |
| --- | --- |
| **Campbell Bird, 148Apps, December 30, 2019** [R1] | Full mobile review. Enjoys responsive improvisation when the player contributes useful detail; reports repetition, forgetting and persistence/session frustration. The historical inability to save does not override current Adventure documentation. |
| **Craig Grannell, Stuff, January 12, 2020; page also lists October 25, 2021** [R2] | Full review. Enjoys custom premises and surreal surprises, but notes slow responses and abrupt situational changes. The crash example is his report, not a current model test. |
| **Nicolle Lamerichs, January 20, 2020; February 27 also displayed** [R3] | Substantive first-person critical essay. Values collaborative invention and active revision; a generated detour can become useful material. Her explanation of model learning is not used as technical evidence. |
| **Ars staff, January 20, 2020** [R4] | Complete group play report, with Jim Salter, Sam Machkovech, Kate Cox, Peter Opaskar and Lee Hutchinson separately credited. Experiences differ: amusing improvisation can coexist with inventory/identity failures, loops and network interruptions. This is one editorial source, not five publications or evidence of current defect frequency. |
| **Alex Mitchell, electronic book review, January 9, 2022** [R8] | Peer-reviewed criticism of interface/framing and repeated revision. Contrasts AI Dungeon's straightforward authorial control with Project December's deliberately strange framing. This is an interpretation of historical experiences, not a controlled quality trial or evidence that Project December mechanics exist in AI Dungeon. |
| **Christoph Bartneck, June 26, 2022** [R5] | Short reflection with a complete transcript: creative promise confronts failure to maintain the intended actor and situation. Model/configuration detail is insufficient for a broad benchmark. |
| **Jody Macgregor, PC Gamer, December 8, 2019** [R7] | Short firsthand report, not a scored review. His wizard story illustrates surprising narrative potential alongside loops and crashes in that early build. |
| **DreamGen, updated March 14, 2026** [R6] | Substantial hands-on review published by a competitor. Reports engaging **Sol: A Homecoming** play alongside memory/editor friction and an anticlimactic resource quest. Multiplayer was explicitly not tested. Commercial interest remains visible. |

DreamGen dates its testing to February 23–March 8, 2026 and compares Free with a Legend trial. Its introduction says twenty hours, while its methods describe roughly twelve hours plus three scripting hours; no reconciled duration is invented. Privacy/pricing assertions and claims of script enforcement are not accepted as primary technical evidence. [R6]

### Steam: attempted sampling, not fabricated review bodies

Both the helpful-all-time and negative-review routes for app **1519310** returned a content-preference gate instead of review bodies. A negative JSON retrieval also failed. This establishes an access limitation, not zero reviews, universal deletion or the absence of negative opinion. The Steam client's retirement is independently documented above. No helpful Steam positive/negative body is counted as freshly read. [U3] [U4]

### Fresh Reddit and App Store evidence

The original Reddit thread was recovered. One participant reports a shopping scene abruptly becoming a home conversation; another dislikes the narrator imposing emotions, while a respondent does not reproduce all complaints but recognizes repetition. Other replies describe different experiences with retries or changing models. No shared controlled setup or prevalence estimate follows. The prior register dates the thread to July 2026; the newly retrieved page uses relative dates, which do not independently reconfirm every exact day. [U1]

On the US App Store, **UberBolton** describes revising an initially negative assessment upward as experience improved, while reporting search trouble on iPad but not iPhone/web. The displayed review day omits its year. **nickname153717372**, March 31, 2025, enjoys the game but reports invisible text after app switching and frustration with memory retaining trivial details. These are individual reports, not proven current cross-device defects. [U2]

The earlier shared study's **Gummiprince, LamentfulLancer, Sky2400 and KairoCortez** accounts remain preserved there. Their original alternate-language/reviews route failed, and those handles did not appear in the newly accessible US sample; they are therefore earlier captured testimony, not newly reread bodies. The new sample supplements rather than replaces them.

**Reception interpretation:** fluency, continuity, authorial control, meaningful challenge, creator-tool reliability and service access are separate dimensions. A player can praise imaginative output while criticizing memory or an editor; these positions are not contradictory. Learning the tools may improve an experience without excusing lost data or proving that every dissatisfied user misunderstood the product.

## 10. Transferable inspiration and counterpoints

These are **research interpretations, not accepted OpenLegend requirements**.

1. **Make the participant's role clear.** Acting, authoring and correcting are different powers. Co-authoring can be the whole point; a persistent simulation should not silently treat an outcome assertion as a completed world change. The counterpoint is that overrestricting authoring would remove an important creative pleasure.
2. **Make continuity inspectable.** Show the relevant facts and whether they participated in a generation. Saved notes, selected context and applied behavior are separate states. Context inspection should help diagnose a problem without demanding that every player become a prompt engineer.
3. **Preserve surprise without treating inconsistency as surprise.** A personally meaningful revelation can be delightful; accidentally changing the actor or location can destroy the premise. Let players accept a useful detour while supplying appropriate repair tools for accidental contradiction.
4. **Separate fictional progress from service consumption.** A quest ingredient, a reusable scenario, a memory entry and a paid Credit solve different problems. Neither a larger context window nor a longer answer automatically creates challenge or a worthwhile return loop.
5. **Evaluate creator rules at their actual boundary.** Scripting can introduce explicit state, but a status flag or lore update does not certify correct resource accounting. Conversely, the base game's co-authoring contract is not evidence that useful rules are impossible to add.
6. **Treat models and configuration as part of the reviewed experience.** A named product may change through model routing, settings and interface updates. Preserve dates and setups when interpreting both praise and complaints; do not turn a memorable old failure into a timeless verdict.

The earlier chapter's central distinction remains intact: study the pleasure of language and co-authorship without confusing it with shared authoritative simulation. The counterpart also remains intact: a collaboratively authored story does not need to become a simulation to have value.

## 11. Coverage, preservation and reading routes

| Requirement | Substantive coverage |
| --- | --- |
| R01 | Section 1: identity, current/historical clients, model and Voyage/script boundaries. |
| R02 | Section 2: controls and explicit mechanics inventory; sections 3–5 cover their operating conditions. |
| R03 | Section 3: Scenarios, Adventures, contextual artifacts and scripts; section 2 distinguishes fictional equipment. |
| R04 | Section 4: session/long-term play, failure/repair, pacing and distinct service currencies. |
| R05 | Section 7: eight worked situations, with attributed reports versus constructed workflows explicit. |
| R06 | Section 5: characters, relationships, group entry, host resources and continuity limits. |
| R07 | Section 6: text presentation, image generation, themes/input/readability and audio/accessibility evidence boundaries. |
| R08 | Sections 1, 5 and 7: varied premises, named reported stories, player authorship and narrative continuity. |
| R09 | Section 8: origins, collaboration, hosting, iteration, retirement and current memory/model changes. |
| R10 | Sections 3, 5 and 8: discoverable scenarios, sharing units, early attention and distribution history. |
| R11 | Sections 4 and 8: dated participation, price-history boundaries, currencies and unknown private financials. |
| R12 | Section 9: eight distinctly typed written accounts, fresh player bodies, contrasting perspectives and Steam gate. |
| R13 | Section 10 and labeled interpretations throughout: patterns, conditions and counterpoints. |
| R14 | This section and source register: original owners, evidence dates/limits, routes and preservation. |

**Per-game preservation review:** the full original chapter and shared study were compared with this pass. Their language/action, editing, trigger timing, context-budget, model-risk, App Store and viewing material remains in its original owners. The original Reddit complaint was freshly retrieved with disagreement retained; older App Store handles remain earlier evidence. No Scribblenauts material was altered. This does not certify packet-wide P01 or unavailable conversation-only coverage P02.

**Reading/viewing route:** start with the earlier chapter and shared study, then compare the official controls/Scenario documentation with the differently motivated reviews. The existing [Vinesauce/Vinny AI Dungeon 2 #1 recommendation](https://www.youtube.com/watch?v=7M-IVNQS2t0) is a historical 2019 entertainment route with mature language, not evidence of current models, pricing or tools. It remains **unwatched** here; no scene observations or timestamps are invented. Worked reports above reveal events from their specific generated stories, not a canonical campaign ending.

**Review boundary:** checked the complete category map, reference definitions, relative destinations, preserved examples and distinction between sourced facts and interpretation. No runtime code or tests changed. No hidden simulation implementation, current audio delivery, comprehensive accessibility result, private financials or inaccessible Steam bodies are claimed verified. Current help pages sometimes retain older tier terminology; this dossier does not splice them into a fictitious unified price table.

## Source register

Read September 26, 2026. Official help pages are mostly undated live documentation, not independently tested implementation. Review/article dates and scopes appear in section 9. Described play belongs to each author. Reference labels are adjacent to their substantive claims.

### Official product and technical evidence

- **P1:** Traveler FAQ; historical Steam access changes and early-2024 retirement, not a current premium price list.
- **P2:** How to Play; controls, editing and session-boundary guidance.
- **P3:** Story Cards; fields, triggers, timing and management limits. Documentation, not replayed tests.
- **P4:** Memory System; summary/retrieval behavior, editing limitation and explicit Voyage distinction. Relevant mechanism/FAQ sections read.
- **P5:** Multiplayer FAQ; host access, codes, naming and participation controls.
- **P6:** Character Creator/Worlds guide; starting options, authored examples and special field semantics.
- **P7:** Scripting API; relevant overview, lifecycle, state and execution-limit sections read. No script execution or full platform-source audit.
- **P8:** Scenarios guide; reusable setup, publishing and input/context distinction.
- **P9:** Adventures guide; individual story histories and editing workflow.
- **P10:** Plot Essentials; concise recurring context and tense/continuity cautions.
- **P11:** Author's Note; short tone/style guidance and context placement.
- **P12:** Plot Components; roles of instructions, summary and narrative direction.
- **P13:** AI Model Differences; current introductory/Dynamic Small, Muse and Wayfarer sections and model index inspected. Developer positioning, not a benchmark of every listed model.
- **P14:** Model Settings; response/context length and sampling controls. Simplified help explanations are not copied into a new technical theorem.
- **P15:** See Mode; generated-image workflow and prompt-dependent presentation. No images generated for testing.
- **P16:** Credits; subscription/purchase/consumption structure. Numerical help examples are not asserted as current universal tariffs.
- **P17:** Scales; earned rewards, tips and speed-boost uses; no cash-out inference.
- **P18:** System Settings; interface/readability, visibility and inspection controls. No device or assistive-technology test.
- **P19:** Privacy page, displayed revision September 25, 2023; limited factual policy context, not a comprehensive current legal assessment.

### Production and independent reception

- **D1:** John Harris interviews Nick Walton, January 9, 2020; primary origin/development testimony. Future-facing statements remain historical plans.
- **D2:** Latitude Team, February 11, 2020; primary company scaling narrative and dated participation claims, not audited finances.
- **R1–R7:** Written review/critical accounts identified in section 9; all used article bodies read. R5/R7 are shorter supplementary accounts; R6 has an explicit competitive commercial interest.
- **R8:** Alex Mitchell, January 9, 2022, peer-reviewed comparative essay; AI Dungeon analysis and comparative framing/conclusion read. Project December is not treated as part of AI Dungeon.

### Player evidence and access limits

- **U1:** Original Reddit thread retained from the earlier source register, freshly read with replies. Relative dates and uncontrolled model/scenario differences limit comparisons.
- **U2:** US App Store listing and exposed review bodies, freshly read. No assumed helpful ordering, representative prevalence or invented year for day-only dates.
- **U3/U4:** Requested helpful-all-time positive/mixed and negative Steam surfaces returned a content-preference gate. Negative JSON endpoint failed. No review bodies counted.
- TapSmart's February 2020 review was located but repeated retrieval failed; it is not counted as read. Latitude's original April 2021 community update, ads retrospective and December 2022 Unchained article returned no readable bodies; the historical moderation reference above is explicitly through Mitchell, not a newly read company post.
- Earlier shared-study App Store accounts and video recommendations retain their earlier-capture/unwatched status. Wikipedia was used to locate original article links, not as the authority for technical rules or newly asserted financial history.

[P1]: https://help.aidungeon.com/faq/what-happened-to-the-travelers-tier
[P2]: https://help.aidungeon.com/faq/how-to-play
[P3]: https://help.aidungeon.com/faq/story-cards
[P4]: https://help.aidungeon.com/faq/the-memory-system
[P5]: https://help.aidungeon.com/faq/do-you-support-multiplayer
[P6]: https://help.aidungeon.com/faq/whats-the-difference-between-scenarios-and-worlds
[P7]: https://help.aidungeon.com/scripting
[P8]: https://help.aidungeon.com/faq/what-are-scenarios
[P9]: https://help.aidungeon.com/faq/what-are-adventures
[P10]: https://help.aidungeon.com/faq/plot-essentials
[P11]: https://help.aidungeon.com/faq/what-is-the-authors-note
[P12]: https://help.aidungeon.com/faq/plot-components
[P13]: https://help.aidungeon.com/ai-model-differences
[P14]: https://help.aidungeon.com/faq/what-are-advanced-settings
[P15]: https://help.aidungeon.com/prompt-guide
[P16]: https://help.aidungeon.com/faq/what-are-image-credits
[P17]: https://help.aidungeon.com/faq/how-can-players-spend-scales
[P18]: https://help.aidungeon.com/understanding-settings
[P19]: https://help.aidungeon.com/latitude-privacy-policy
[D1]: https://www.gamedeveloper.com/design/creating-the-ever-improvising-text-adventures-of-i-ai-dungeon-2-i-
[D2]: https://aidungeon.medium.com/how-we-scaled-ai-dungeon-2-to-support-over-1-000-000-users-d207d5623de9
[R1]: https://www.148apps.com/ai-dungeon/ai-dungeon-review/
[R2]: https://www.stuff.tv/review/app-of-the-week-ai-dungeon-review/
[R3]: https://nicollelamerichs.com/2020/01/20/writing-with-algorithms-in-ai-dungeon/
[R4]: https://arstechnica.com/gaming/2020/01/we-test-ai-dungeon-2-a-text-adventure-that-creates-itself-with-your-help/
[R5]: https://www.bartneck.de/2022/06/26/ai-dungeon/
[R6]: https://dreamgen.com/blog/articles/ai-dungeon-review
[R7]: https://www.pcgamer.com/this-ai-writes-a-text-adventure-while-you-play-it/
[R8]: https://preview.electronicbookreview.com/publications/repetition-and-defamiliarization-in-ai-dungeon-and-project-december/
[U1]: https://www.reddit.com/r/AIDungeon/comments/1upbe4v/ai_dungeon_sucks_now/
[U2]: https://apps.apple.com/us/app/ai-dungeon-rpg-story-maker/id1491268416
[U3]: https://steamcommunity.com/app/1519310/reviews/?browsefilter=toprated
[U4]: https://steamcommunity.com/app/1519310/negativereviews/?browsefilter=toprated
