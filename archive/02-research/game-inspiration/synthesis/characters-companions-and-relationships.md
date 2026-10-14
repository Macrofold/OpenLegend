# Characters, companions and relationships

| Field | State |
| --- | --- |
| Topic | **NPC** |
| Status | Substantive synthesis completed for the October 14 intelligence/simulation pass. Broader relationship genres remain open, not implicitly fully researched. |
| Last substantive review | 2026-10-14 |
| Evidence | Scoped game dossiers, developer implementation accounts, academic papers and industrial examples; no new game execution or OpenLegend benchmark. |
| Authority | Research and recommendations, not an accepted feature specification or runtime-policy change. |

[Topic map](README.md) · [Game coverage](coverage.csv) · [World coverage](world-coverage.csv) · [Assessment records](assessment-records.md) · [Template](main-topic-template.md) · [Research inventory](../research-progress-intelligent-simulation-2026-10-14.md) · [Existing design register](../../../../docs/maintainers/needs-design.md)

**Reading route:** this guide owns the character experience and decision boundary. [Efficient simulation and intelligence](simulation-and-intelligence.md) owns the technical comparison and cost model. [Academic and industrial evidence](simulation-and-intelligence-evidence.md) owns the non-game source assessments. Game implementation and access details remain in the linked dossiers, rather than being repeated as competing specifications.

## The experience and the central question

A person should be worth knowing because what they notice, choose, do and remember belongs to a continuing life. The player may act alongside them, observe, ask for help, disagree, compete, teach, care, decline contact or leave them alone. The person should have opportunities not centered on the player, including ordinary pleasure, useful work, curiosity and chosen solitude.

The research question is not how to maximize the number of times an NPC calls a model. It is how to preserve meaningful freedom and continuity while making the intervals between consequential choices inexpensive.

**Our recommendation:** let cognition choose intentions and appropriate limits; let reliable native execution carry accepted activity forward; reopen choice when those limits, supporting facts or personal meaning may have changed. Retain opportunities for curiosity and reinterpretation even when no mechanical failure occurs. This is a research direction, not a claim that the complete mechanism is already implemented.

“True cognition” is used here as a product ambition for flexible interpretation and decision-making, not a demonstrated claim of consciousness. A fluent model is not necessarily grounded or coherent. A native planner can genuinely solve a bounded problem without understanding arbitrary personal meaning. Evaluate capabilities rather than assigning one intelligence label to an entire system.

## Ownership boundary

NPC owns individual agency, personal relationships and companion experience. [SPEECH](conversation-language-and-communication.md) owns communication mechanics; [KNOW](information-investigation-and-puzzles.md) owns evidence and investigation; [SYSTEMS](ecology-and-systemic-emergence.md) owns broader systemic interactions; [LOGISTICS](logistics-automation-and-management.md) owns operating flows; [ACTION](actions-affordances-and-improvisation.md) owns supported possibilities and improvisation. Player-to-player coordination belongs to MULTI; society-wide institutions to SOCIETY. The topic map identifies their canonical guides.

The current pass is strongest on autonomy, cognition, memory, execution and simulation efficiency. Friendship, rivalry, care, teaching, family, courtship, grief and animal bonds remain important dimensions of this topic. The cases below illuminate their mechanisms but do not certify exhaustive research of every relationship genre. Baldur's Gate 3 and Dragon's Dogma 2 remain useful original candidate routes; their entire companion systems were not newly assessed here.

## Desired experiences and contrasting approaches

| Approach | What it can serve well | What it does not automatically supply |
| --- | --- | --- |
| An authored companion with selected scenes | Carefully paced characterization, recognizable boundaries, polished outcomes | Independent interpretation of unanticipated situations |
| A needs-and-work simulation | Legible daily activity, operational competence, many interacting inhabitants | A person's freedom to reject the designer's priority ordering |
| A bounded planner | New combinations of known actions, local recovery from failure | Understanding a concern absent from its represented goals and facts |
| A learned nonverbal controller | Adaptive familiar behavior or embodied skills | Broad social meaning or reliable autobiographical memory |
| An LLM-driven character | Flexible language, interpretation, analogy and novel proposals | Fast, correct execution or coherent persistent consequences by itself |
| A hybrid with continuing intentions | Expensive judgment where useful, inexpensive follow-through | A free solution to detecting every meaningful exception |

These are not a universal ranking. A small animal, tactical adversary, household member and long-term companion can justify different authored controllers. The mistake is promising independent people while secretly constraining them to a fixed maintenance policy, or adding expensive generation where a reliable small controller already fulfills the intended experience.

For a newcomer, useful behavior may simply be a person responding appropriately and completing what they chose. For an established player, nuance may lie in a remembered disagreement or a changed ambition. For a world creator, the value is expressing different laws and cultures without editing a universal human-behavior script. For an observer of a large population, aggregate views should lead back to real individual causes where those causes are represented.

## Cross-game evidence and counterexamples

The following are navigation and comparison, not additional independent evidence beyond their originating sources. Each dossier labels versions, access depth and limits.

| Source | Question it most usefully answers | Counterweight |
| --- | --- | --- |
| [RimWorld](../dossiers/intelligence/rimworld.md) | How can structured activity continue and fail clearly? | Explicit policy fixes remain necessary; current decompiled code was inaccessible, and new engine gains are vendor beta claims. |
| [Songs of Syx](../dossiers/intelligence/songs-of-syx.md) | How can individual participation support a much larger settlement? | Population scale does not establish open-ended individual deliberation; exact current controller remains unverified. |
| [The Sims](../dossiers/intelligence/the-sims.md) | How can world objects expose reusable opportunities? | Immediate satisfaction can dominate a broader life; data-driven rules remain authored rules. |
| [Dwarf Fortress](../dossiers/intelligence/dwarf-fortress.md) | How can experiences and institutions continue to matter? | Detailed memory bookkeeping is not general understanding. |
| [F.E.A.R.](../dossiers/fear.md) | Can alternative means emerge without enumerating every transition? | Bounded planning and apparent coordination must not be mistaken for unrestricted cognition. |
| [Halo 2](../dossiers/halo-2.md) | How can events inform arbitration without directly commanding behavior? | A finite behavior hierarchy can become a ceiling on possible responses. |
| [Left 4 Dead](../dossiers/left-4-dead.md) | How can interruption preserve resumable work? | A dramatic director and a persistent individual's knowledge are different authorities. |
| [Rain World](../dossiers/intelligence/rain-world.md) | What makes nonverbal independent creatures legible? | Unscripted interaction can also be opaque, unfair or unplayable. |
| [Factorio](../dossiers/intelligence/factorio.md) | How can unchanged work and redundant representation be eliminated? | Candidate selection and time approximations can change behavior, not merely cost. |
| [Shadows of Doubt](../dossiers/shadows-of-doubt.md) | When do precomputed routines become too brittle? | Long plans are not always the best way to save computation. |
| [Versu](../dossiers/versu.md), [Prom Week](../dossiers/prom-week.md) | How can reusable social structure preserve separate choices? | Rules still cost authoring; some knowledge shortcuts conflict with OpenLegend. |
| [Creatures](../dossiers/creatures.md) | What can learn without language-model inference? | Learning a motor habit does not settle a person's values. |
| [Hitman: Absolution](../dossiers/hitman-absolution.md), [Alien: Isolation](../dossiers/alien-isolation.md) | How do layers, perception and presentation support apparent life? | The inspected evidence is limited to official presentation overviews. |
| [Seven additional comparisons](../dossiers/intelligence/additional-comparisons.md) | How do persistence, bodies, systemic consequences and authored history change the comparison? | They are scoped assessments of existing dossiers, not new proprietary implementation audits. |

## Consolidated lessons and tradeoffs

<a id="npc-l001"></a>
### NPC-L001 — Distinguish a fixed vocabulary from a fixed sequence

A priority tree, utility scorer and planner can all select behavior dynamically, but differ in what their authors must represent. A planner can search combinations without a hand-authored transition for every case. It still cannot weigh a promise that never enters its model. [F.E.A.R.](../dossiers/fear.md) and [The Sims](../dossiers/intelligence/the-sims.md) supply contrasting implementations.

For OpenLegend, structured actions should expose real prerequisites and effects; cognition should interpret why an available action matters. The alternative is a deliberately finite controller for a narrower creature. Do not spend LLM calls just to preserve an ideological distinction between “AI” and ordinary code.

<a id="npc-l002"></a>
### NPC-L002 — A choice should remain useful beyond one mechanical step

A decision to prepare a particular meal or visit someone can authorize a bounded sequence rather than force repeated approval of every pickup and movement. The scope should include a purpose, permitted means, material limits, a stopping condition and circumstances that call for reconsideration. This inference connects [RimWorld](../dossiers/intelligence/rimworld.md), [Left 4 Dead](../dossiers/left-4-dead.md) and [Voyager research](simulation-and-intelligence-evidence.md#e09--voyager-reuse-executable-skill-not-a-whole-life-policy).

A one-step choice remains appropriate when the next outcome is highly uncertain. Longer plans save calls only while their assumptions remain useful; [Shadows of Doubt](../dossiers/shadows-of-doubt.md) is direct counterevidence to precomputing the longest possible routine.

<a id="npc-l003"></a>
### NPC-L003 — Native discretion must stay inside the character's accepted limits

“Choose the means, not the end” is insufficient. Stealing a tool and burning a keepsake can be means to an unchanged goal. Autopilot should vary only details that the character has actually left open. Path repair or selecting an equivalent designated material may qualify; a new risk, obligation or personally meaningful substitution may not.

This is our interpretation of the planning and delegation comparisons, not a claim that another game's controller already represents these boundaries. The burden is defining supported, inspectable limits without forcing every decision to enumerate an entire moral theory. Start with the concrete activity and its plausible failure paths.

<a id="npc-l004"></a>
### NPC-L004 — A stimulus should make a decision relevant, not choose its answer

A changed need, refusal, injury or unavailable resource can justify attention without prescribing eating, fleeing, apologizing or abandoning work. Event delivery and interpretation have different responsibilities. [Halo 2](../dossiers/halo-2.md) offers a useful architectural separation; OpenLegend's authorship contract supplies the stronger individual-agency boundary.

Mechanical impossibility is different. An incapacitated body cannot continue an incompatible physical action, regardless of preference. Conversely, “always avoid danger” is a value policy, not a neutral body constraint. Those rules may be appropriate for a deliberately authored organism, but should not silently govern every person.

<a id="npc-l005"></a>
### NPC-L005 — Cheap attention cannot guarantee every meaningful exception

Monitoring the assumptions of an ongoing activity can eliminate much polling. Character-selected cues can focus attention on known people, deadlines and commitments. Yet an ordinary remark may unexpectedly connect to an old memory. No finite cheap filter guarantees recognizing all such meaning.

Retain some open-ended reconsideration, including self-initiated interest and quiet reflection. Its frequency and budget require empirical comparison, not a universal cooldown. A gate that performs nearly the same retrieval and inference as the decision it avoids may offer no saving. [Simile's confidence work](simulation-and-intelligence-evidence.md#e03--similes-newer-confidence-work-prediction-and-knowing-when-to-trust-it) supports evaluating the gate separately from its preferred answer.

<a id="npc-l006"></a>
### NPC-L006 — Memories need provenance and consequences

Separate what happened, what a person could notice, what they believe and how they interpret it. A recollection can be wrong without the world record becoming wrong. Later interpretation can change without rewriting the original experience. [Dwarf Fortress](../dossiers/intelligence/dwarf-fortress.md), [social models](../dossiers/prom-week.md) and [memory evaluations](simulation-and-intelligence-evidence.md#e10--longmemeval-retrieval-and-reading-are-separate-failure-points) inform different parts of this conclusion.

A stored promise or required recent result should not vanish merely because a generic similarity search preferred something else. Conversely, a remembered intention must not authorize fresh execution. Durable commitments, current bodily conditions and remembered experiences retain different semantic owners.

<a id="npc-l007"></a>
### NPC-L007 — Let personality influence attention and interpretation without becoming a hidden script

A person who enjoys careful craft may notice a join, take pride in a repair or choose to help. “When supplies are full, go watch animals” prescribes a trajectory even when written in natural language. The [current character-authorship contract](../../../../docs/projects/compelling-characters-feature-spec.md#character-authorship-and-changing-personality) explicitly rejects that substitution.

Personal history should include pleasure, care, work, privilege, changing roles and imperfect self-understanding, not just trauma. Formative experience can influence a person without being mechanically converted into a trait. More dimensions are not automatically better if none changes a later choice. A small amount of specific relevant grounding is a meaningful alternative to an enormous biography.

<a id="npc-l008"></a>
### NPC-L008 — Reusable social situations should offer choices, not control everyone

A meal, lesson or disagreement can supply shared context and supported opportunities. Each participant still chooses whether to join, continue, refuse or leave. One actor's prediction of another's response is not consent or an outcome. [Versu](../dossiers/versu.md) and [Prom Week](../dossiers/prom-week.md) make useful contrasts with a single scripted dialogue sequence.

Cultures and institutions may author expectations, but those are not universal engine laws. Understanding a norm need not imply obeying it. The alternative is a deliberately narrow authored encounter; it may be more polished, but should not be mistaken for an independent relationship.

<a id="npc-l009"></a>
### NPC-L009 — Apparent intelligence depends on observable causal continuity

A character notices something, responds in a readable way and later behaves as someone affected by it. That can feel more alive than constant internal narration. A movement, changed possession or remembered name can communicate continuity. The [Shadow of War and Wildermyth comparisons](../dossiers/intelligence/additional-comparisons.md) illustrate different bounded routes.

Presentation must not fabricate causality. A shouted request is not proof anyone heard or accepted it; [F.E.A.R.'s account](../dossiers/fear.md) makes this distinction unusually concrete. OpenLegend can support lies and mistaken claims while keeping the event record precise. Legibility should reveal relevant behavior, not retrofit an invented explanation.

<a id="npc-l010"></a>
### NPC-L010 — Independence is not the same as maximizing disturbance

A person can finish, rest, enjoy company or decline a new project. A stable relationship or solved material problem need not be destabilized to justify another model call. A dramatic director may suit an encounter-driven game, but it is not automatically the correct authority for an authored reality. [Left 4 Dead](../dossiers/left-4-dead.md) and [Rain World](../dossiers/intelligence/rain-world.md) provide contrasting design pressures.

A quiet world can still contain curiosity and change. The test is whether people can form and revise purposes, not whether every interval produces a crisis. Constant activity rotation is as artificial as never changing activity.

<a id="npc-l011"></a>
### NPC-L011 — Reduce computation independently from reducing personhood

Rendering detail, movement precision, bodily progression, economic effects, memory and deliberation frequency are separate dimensions. A person can think less often while retaining exact possessions and commitments. A background crowd can also be intentionally anonymous, but that is a different product promise. [Songs of Syx](../dossiers/intelligence/songs-of-syx.md), [Hitman](../dossiers/hitman-absolution.md) and the [CDDA comparison](../dossiers/intelligence/additional-comparisons.md#cataclysm-dark-days-ahead) motivate this separation.

A camera should not create a new personality or invent a past for someone already encountered. In a world with multiple observers, “far from the player” is not even a single authoritative classification. The technical companion examines causal and scheduling limits.

<a id="npc-l012"></a>
### NPC-L012 — Optimization of candidates is part of behavior

Removing impossible actions can be exact. Keeping only nearby, popular or easily scored actions can be a substantive approximation. The model cannot reliably choose an omitted alternative merely because it is intelligent. [Factorio's search example](../dossiers/intelligence/factorio.md) shows why selection algorithms can change outcomes.

Evaluate whether a candidate set preserves the meaningful exception: another person's property, a promise, a safer unfamiliar route or an opportunity to stop. A small candidate set with an honest ability to ask for another supported approach may outperform both an enormous catalogue and a silently restrictive shortlist.

<a id="npc-l013"></a>
### NPC-L013 — Learned shortcuts need a declared objective and an escape route

Small learned controllers and specialized models are legitimate alternatives to rules or repeated large-model inference. [Creatures](../dossiers/creatures.md), [Socrates](simulation-and-intelligence-evidence.md#e05--socrates--socsci210-narrow-specialization-can-beat-a-larger-general-model) and [Light Society](simulation-and-intelligence-evidence.md#e07--light-society-very-large-populations-through-approximation) address very different tasks.

For OpenLegend, a learned routine should not silently replace personal choice because it usually agrees with a teacher model. Rare disagreement may be the only place a promise or unusual value matters. Start with explicit reuse of a chosen method; consider broader learned policies only when data, evaluation and maintenance justify them.

<a id="npc-l014"></a>
### NPC-L014 — Evaluate complete lives in small pieces, not isolated eloquence

A good answer can be followed by invalid action, forgotten outcome, endless repetition or an incoherent next goal. Evaluate an episode from intention through consequences and later return. Include false beliefs, refusal, resource contention, interruption, recovery, stopping and a changed preference.

A more expensive model is a useful comparator, not an infallible ground truth. [Survey-simulation counterevidence](simulation-and-intelligence-evidence.md#e12--negative-evidence-synthetic-respondents-can-match-means-and-miss-relationships) reinforces the need to examine variation and relationships, not only plausible averages. Cost savings and behavioral regressions should be reported separately.

## Current OpenLegend baseline and existing design owners

**Evidence snapshot:** `Macrofold/OpenLegend` GitHub `main` at `57a2977e22bab3f7293caa4a176c9ef4ba800751`. This section uses inspected specifications and their recorded implementation status, not a new runtime audit.

The [agency specification](../../../../docs/agent-agency.md) already distinguishes native ongoing execution, grounded Decision API selection and generative cognition. It documents the removal of automatic person-level eating/berry-seeking: bodily pressure informs choice instead of universally choosing a goal. It also distinguishes known-method bookkeeping from giving a character undiscovered knowledge. These are foundations to preserve, not missing capabilities to redesign from scratch.

The [compelling-characters specification](../../../../docs/projects/compelling-characters-feature-spec.md) reports delivered unified personal evidence, native perspective and a bounded demonstration, while broader character reliability remains open. It explicitly requires relevant outcomes not to disappear through optional recall and separates current goals/body conditions from memory. Its contrary stockpiling trials are evidence against claiming complete whole-life reliability.

The documented meal episodes still involve successive choices rather than a general reusable learned method. That supports investigating a longer useful decision horizon, but does not prove that the existing plan system is absent. The research should extend existing semantic owners, not introduce a second writable goal, memory or execution system.

The [memory architecture](../../../../docs/memory-architecture.md), [source-and-goal map](source-and-goal-map.md#topic-npc), existing project designs and [design register](../../../../docs/maintainers/needs-design.md) remain the routing owners for later decisions. This pass does not change attention guarantees, install new personality mechanics, approve background simulation, or set a production cognition budget.

## Complete situations and cross-topic consequences

All four situations below are **hypothetical evaluation examples**, not claims of executed or completely supported OpenLegend gameplay. Each uses actual supported capabilities only if chosen for a later experiment.

### A. A meal that becomes complete

A person notices hunger while pursuing another interest. They know an available method and have permitted supplies. Cognition chooses whether to eat now, wait or seek something else. If preparing a meal is chosen, native work may carry the accepted steps forward within the selected ingredients and quantity.

A missing tool can justify local repair if an equivalent allowed tool exists. Discovering that the only food belongs to an absent neighbor requires new judgment. Actual preparation and eating change the world and body; the result must reach the next decision. The person can stop provisioning and return to their previous interest, choose company, rest or form another purpose. A later meal need not erase the earlier success: the body changes over time, while the experience remains.

**Compare:** one-action decisions, a bounded chosen sequence and a universal hunger controller. Check not just survival but ownership, stopping, total calls and the ability to choose an exception. CRAFT, BODY, KNOW and LEISURE share the consequences.

### B. An interrupted repair and a promise

A person chooses to repair a shelter before night with designated supplies. Ordinary movement and work can continue cheaply. Another person asks for help with a personally important task. The worker may finish a short step, pause, refuse, negotiate or abandon the repair; no single answer is mandated.

Suspending work preserves actual progress and consumed materials. The requester independently responds. On return, the worker considers whether the shelter, resources and deadline still justify resumption. The repair can become complete and stay complete until something actually changes it. A promise kept or broken can affect a later encounter without automatically becoming a permanent personality trait.

**Compare:** always resume, always replan and resume after relevant validation. Observe whether the implementation preserves both physical work and personal freedom. ACTION, BUILD, SPEECH and NPC intersect.

### C. A quiet gathering with unequal interpretations

A host invites two acquaintances. One accepts, one declines, or both arrive for different reasons. Shared activity exposes supported opportunities, not a mandatory social script. Someone may enjoy listening rather than speaking. Another may leave early because of a commitment. A harmless-looking remark can carry personal meaning because of a prior experience.

The conversation record distinguishes what was said and heard from what each person concluded. A host may mistakenly think the evening went well. Later, a guest may seek clarification, avoid the host, or decide the remark was unimportant. There need be no fight, relationship point reward or productivity benefit. The evening can simply have been worthwhile.

**Compare:** scripted exchange, independent interpretation at every line and selective interpretation around relevant changes. Evaluate latency, turn-taking, knowledge boundaries and later behavior. SPEECH, LEISURE, KNOW and LORE connect without requiring a crisis.

### D. A distant traveler who remains the same person

A traveler leaves to visit a known person while carrying a particular object. A coarse native representation may advance an uneventful portion of the journey. Another actor, obstacle or relevant event interrupts that assumption. The simulation must resolve the encounter at the appropriate causal point rather than retroactively inventing a completed journey.

A second observer later meets the traveler. They encounter the same body, possessions, permitted knowledge and unfinished commitments. The traveler can report only what they experienced or learned, not a convenient omniscient summary. Arrival can fulfill the journey; a changed invitation may instead lead to waiting, leaving or another choice.

**Compare:** full local stepping, event-based advancement and a more approximate background model. Check lost encounters, duplicate resources, history consistency and latency when detail increases. TRAVEL, MULTI, TRUST and NPC share the contract.

## Possible OpenLegend applications and limits

The smallest useful application is not a new universal mind. It is one familiar activity whose accepted purpose and limits remain useful for several native steps, with reliable outcome evidence and a meaningful opportunity to reconsider. Compare it against the existing behavior before broadening the abstraction.

A second candidate is identifying which facts actually support an activity and delivering changes to those facts efficiently. A third is measuring the cost and error of attention routing separately from the decisions it routes. These are research applications under existing owners, not newly registered implementation projects.

Do not copy arbitrary model-generated code, universal survival priorities, omniscient social memories, player-centered forced drama or a population headline detached from its workload. Do not treat a natural-language conditional in biography as less hardcoded than the same conditional in TypeScript. Do not require constant novelty to demonstrate autonomy.

## Open questions and missing evidence

The most important unresolved question is the quality-cost boundary: how much activity can one chosen intention safely cover, and which exceptions are lost when review becomes less frequent? The answer likely depends on the activity, available evidence and individual commitments; no source here establishes a universal interval.

A second uncertainty is whether a cheap gate can recognize consequential novelty without paying most of the cost of full interpretation. A third is whether compact character/memory context retains the details that change later choices. A fourth is whether users prefer the resulting behavior, rather than merely rating its explanation as coherent.

These questions can be investigated with small paired episodes and existing verification tools. They do not require a new testing bureaucracy, an immediate model-training project or a speculative engine rewrite. They also do not invalidate completed design work elsewhere merely because broader experience evidence remains open.

## Design subtopics

**None registered by this research pass.** That does not mean the existing design register is empty. Research lessons and evaluation questions are not implementation tasks. Use the [template](main-topic-template.md) and the established [ND register](../../../../docs/maintainers/needs-design.md#how-to-use-and-maintain-this-register) for any later scoped proposal, with reciprocal specification/design links and existing maintainer owners.

| Subtopic ID | Intended experience and scope | Research lesson / evidence | Design register entry | Feature specification | Technical design |
| ----------- | ----------------------------- | -------------------------- | --------------------- | --------------------- | ---------------- |
