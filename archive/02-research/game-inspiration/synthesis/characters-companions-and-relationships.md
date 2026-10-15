# Characters, companions and relationships

This guide covers characters, companions and relationships as a whole: personality, motivations, independent lives, memory, emotional expression, social bonds, friendship, rivalry, romance, family, care, teaching, animal bonds and the player's experience of those relationships. Intelligence and simulation efficiency are subtopics within that broader scope, not the organizing purpose of the entire guide.

**Topic: NPC · Focused intelligence/simulation pass completed October 14, 2026; broader topic coverage remains open.** The intelligence/simulation research below synthesizes selected game dossiers, primary implementation accounts, academic work and industrial evidence. It is not a claim that every source in the 35-topic matrix has been assessed, that all relationship subtopics are complete, or that any new OpenLegend implementation is approved.

[Topic map](README.md) · [Game coverage](coverage.csv) · [Assessment records](assessment-records.md) · [Dossier/pass inventory](../research-progress-intelligent-simulation-2026-10-14.md)

**Supporting studies:** [Game AI implementation and scale](../references/game-ai-implementation-and-scale.md) · [Efficient individual simulation](../references/efficient-individual-simulation.md) · [Language-model societies and Simile](../references/language-model-societies-and-simile.md). These retain source versions, methods, access limits and detailed counterexamples rather than duplicating them in every lesson.

## 1. Scope and the experience worth preserving

The ambition is a person or creature whose activity continues coherently, whose experience matters later, and whose choices can differ from the player's wishes. For a reflective person, competence alone is insufficient: they may care, refuse, misinterpret, learn, change their mind, enjoy something familiar or prefer to be left alone. Their freedom should affect actual action, not only dialogue surrounding an inevitable result.

A worthwhile ordinary encounter might be returning to someone who has finished work, remembers a shared experience and has their own idea about the afternoon. A worthwhile difficult encounter might involve competing obligations, an unexpected use of a familiar object or a changed impression of another person. Neither requires constant crises, permanent dissatisfaction or a thought printed after every action.

**For the intelligence/simulation subtopic, our central hypothesis is:** let cognition choose intentions and their acceptable bounds; let ordinary machinery carry valid intentions forward; use further cognition when the choice itself needs reconsideration. This is different from placing a conventional survival bot underneath occasional generated conversation.

The question for that subtopic is not how to maximize reasoning tokens. It is how to preserve meaningful alternatives, personal continuity, competent effects and intelligible conduct while avoiding redundant work. “True cognition” here names a functional ambition; this research does not establish consciousness or human-equivalent understanding in any system.

### Ownership and adjacent topics

NPC owns independent lives, personal relationships, companions and the experience of encountering a continuing individual. SPEECH owns conversation mechanics; KNOW distinguishes experienced facts, testimony and belief; BODY owns bodies and life cycles; SOCIETY owns institutions and wider relations; MULTI owns human coordination; SYSTEMS and ACTION own compositional consequences and executable activity. Simulation architecture is considered here where it changes the fidelity or cost of an individual's life, not as a replacement for every neighboring guide.

Friendship, rivalry, romance, family, grief, teaching, care and animal bonds remain in scope. This pass contributes mechanisms for continuity, differing perspectives and consequences; it does not claim a complete literature review of every form of relationship or authorize a universal psychological model.

## 2. What conventional games actually make intelligent

The inspected games do not share one mind architecture. They distribute effort among several different problems.

| Problem | Typical mechanism or precedent | What remains outside that mechanism |
| --- | --- | --- |
| Select an applicable activity | Priorities, conditions or utility among represented opportunities; The Sims is a concrete object-advertisement example. | Understanding arbitrary personal significance not represented in the selection model. |
| Find alternative means | F.E.A.R.'s planning over authored prerequisites/effects. | Deciding whether a new means violates a promise, unless that concern is represented. |
| Carry out and interrupt work | Left 4 Dead's explicit activity transitions; Halo 2's reusable behaviors and execution memory. | The life purpose that should govern those activities. |
| Adapt through experience | Creatures' learned neural associations; Alien: Isolation's saved, authored behavior unlocks are a different kind of adaptation. | Neither establishes unrestricted social interpretation or new executable world laws. |
| Sustain recognizable people | Dwarf Fortress memories, Watch Dogs: Legion identity/schedules, Nemesis encounters, Wildermyth's continuing cast. | Equally detailed simulation of every person at every instant. |
| Coordinate social context | Versu's shared practices and individually selected responses. | Perfect independent beliefs, effortless authoring, or freedom from explicit rule design. |
| Scale bodies and consequences | Crowd systems, Factorio's representation work, simulation frameworks and spatial algorithms. | A particular population's open-ended decision quality. |

The [game evidence study](../references/game-ai-implementation-and-scale.md) identifies what was actually inspected. The distinction is between **authoring possible concerns and means** and **authoring every resulting sequence**. A dynamic plan is not necessarily a prewritten sequence. Conversely, putting thousands of conditions in data instead of code does not eliminate their authoring cost.

Interruptions are similar. The kinds of changes a conventional controller recognizes are usually explicitly represented, while a replacement plan can be computed dynamically. OpenLegend's hardest additional problem is recognizing when an apparently ordinary observation matters because of a person's history, values or interpretation. That recognition cannot be assumed free.

## 3. Consolidated lessons and tradeoffs

The following are research conclusions or hypotheses, not new engine contracts. Each lesson has a stable anchor for evidence tracking. Confidence describes the transfer argument, not a measured OpenLegend result.

<a id="npc-l001"></a>
### NPC-L001 — Preserve the distinction between a person, their skills and their current choice

A method describes something the person knows how to do. An intention describes what they have chosen now. A disposition describes tendencies, not a compulsory conditional policy. A routine can be an adopted choice without becoming an immutable identity.

**Evidence:** The Sims, F.E.A.R., Creatures and Final Fantasy XII expose different ways of representing abilities and selection; their authority models differ. **Application:** reuse known execution while preserving the opportunity to choose otherwise. **Failure/cost:** a hidden “after supplies are full, socialize” biography rule produces the expected demonstration by removing the decision. **Confidence:** strong architectural distinction; the right breadth of a delegated routine remains to be evaluated.

<a id="npc-l002"></a>
### NPC-L002 — Make a valid decision useful for longer

A chosen activity can include a purpose, known means, acceptable substitutions and a stopping condition. Continuing a valid step need not reopen the whole decision. This is the most direct route to fewer expensive choices without substituting a generic personality.

**Evidence:** action continuity in Left 4 Dead, reusable behaviors in Halo 2, temporal abstraction in the options literature, and the historical Shadows of Doubt routine calculation. **Failure/cost:** overly broad delegation can quietly choose theft, risk or resource sacrifice. A “same goal” test is insufficient: the new means may be the consequential choice. **Confidence:** strong motivation; no measured savings or acceptable decision interval is established for OpenLegend.

<a id="npc-l003"></a>
### NPC-L003 — Let the world expose opportunities without assigning everyone's priorities

Supported actions, objects and methods can describe prerequisites, costs and effects. A character can discover candidates without a bespoke rule for every object. Mechanical impossibility and lack of permission can be filtered before expensive deliberation.

**Evidence:** The Sims' object offers, F.E.A.R.'s action composition, CDDA's explicit activity/effect data and Qud's operational knowledge. **Failure/cost:** pruning an unusual but possible choice because a generic score dislikes it can remove the most personal option. An advertised nutritional benefit does not decide whether to consume someone else's meal. **Confidence:** strong for shared semantics; semantic candidate quality requires separate evaluation from query speed.

<a id="npc-l004"></a>
### NPC-L004 — Reconsider when supporting assumptions change, but retain open-ended attention

Target availability, actual results, changed commitments and chosen review times can cheaply identify occasions to reconsider. They should invite a choice, not dictate its answer. Character-selected attention cues can narrow what needs monitoring.

**Evidence:** game interruption machinery, discrete-event scheduling and the society studies' active-subset designs. **Failure/cost:** no finite set of inexpensive predicates guarantees detection of quiet semantic novelty. Event bursts can wake many people together; a cheap gate can become another expensive pipeline. **Application:** compare dependency-based opportunities with some budgeted quiet initiative, curiosity and reflection. **Confidence:** promising, with meaningful missed observations the central unresolved risk. No new cooldown or sensory policy is approved here.

<a id="npc-l005"></a>
### NPC-L005 — Confidence in a decision is not the difference between its top two options

Two equally attractive choices can both be understood; one dominant choice can rest on a missing fact. Escalation should account for uncertainty, consequence, reversibility and time, not merely score concentration.

**Evidence:** Simile's 2026 error-prediction work distinguishes prediction error from simple entropy and top-option-gap features. Its activation-based method also requires model access an opaque API may not supply. **Failure/cost:** uncalibrated self-reported confidence can cheaply justify bad decisions. **Application:** qualify a cheap selector on relevant episode families and rare consequential exceptions before routing by confidence. **Confidence:** strong warning against the proxy; the appropriate OpenLegend labels and gate remain unmeasured.

<a id="npc-l006"></a>
### NPC-L006 — Experience, interpretation and actual effects must stay separate

A witnessed act, a person's belief about its motive, and a later action responding to it are different facts. A summary can aid recall without becoming a second authority over history. An inferred relationship can be directional and revisable without changing the other participant's view.

**Evidence:** Dwarf Fortress, Versu, Shadows of Doubt and Generative Agents offer complementary memory lessons and limitations. **Failure/cost:** repeated rumors become false corroboration; a summary replaces a precise receipt; a persuasive reply invents a successful transfer. **Application:** preserve source identity and recorded precision, retrieve required outcomes, and keep native obligations distinct from recollected promises. **Confidence:** strong integrity requirement; which optional details can be compacted depends on the intended experience.

<a id="npc-l007"></a>
### NPC-L007 — Personal continuity is more than repeated references to the past

A memory earns its place when it changes attention, a later choice or an interpretable relationship. Recognizable return, a retained consequence or a learned useful method can communicate continuity without verbose recollection.

**Evidence:** Nemesis, Wildermyth, Dragon's Dogma 2, Dwarf Fortress and the individual-response studies. **Failure/cost:** predictable callbacks can become repetitive, and frequent reflection can reinforce unsupported interpretations. Population-prediction accuracy is not proof of a particular fictional person's coherent life. **Application:** test a later relevant opportunity, including care and pleasure as well as conflict. **Confidence:** strong design rationale; player attachment and enduring individuality need direct evidence.

<a id="npc-l008"></a>
### NPC-L008 — Shared activity should offer context, not dictate consent

A conversation, meal or joint repair can establish roles, expected outcomes and relevant next steps. Participants can still decline, misunderstand, withdraw or choose a different interpretation.

**Evidence:** Versu's social practices and acknowledged shared-knowledge limits, Watch Dogs: Legion's connected identities, CK3's obligations and the companion dossiers. **Failure/cost:** a single joint prompt may expose everyone's secrets or author every participant's agreement. A universal norm system can become an expensive social script library. **Application:** reuse actual communication and commitment owners; compare small shared agreements with a broader social formalism before adopting the latter. **Confidence:** strong authority distinction, uncertain best representation.

<a id="npc-l009"></a>
### NPC-L009 — Perceived intelligence needs readable action, not incessant narration

Attention, preparation, effort, an understandable interruption and returning to unfinished work can make intention visible. Dialogue should contribute where interpretation or expression matters, not explain every footstep.

**Evidence:** Halo 2 and Left 4 Dead emphasize legible behavior; Rain World and Red Dead Redemption 2 supply embodied contrasts. The existing [human-experience research](../references/fun-research-expansion-ai.md#human-evidence) records both promising engagement and greater cognitive load or reduced trust in different LLM prototypes. **Failure/cost:** a polished explanation can conceal incoherent decisions; free text can burden routine interaction. **Confidence:** supported reason to test legibility separately, not a universal quantitative effect or latency target.

<a id="npc-l010"></a>
### NPC-L010 — Count the entire workload and keep its units honest

Retained identities, visible bodies, active native controllers, admitted model decisions and environment reads are different counts. Cost per call, per completed episode, per real hour and per simulated day answer different questions.

**Evidence:** Songs of Syx and Hitman contrast with OASIS, AgentSociety and LMAgent; Factorio distinguishes local optimization from whole-world improvement. **Failure/cost:** a million-agent headline can conceal sparse activation and long steps; reducing memory tokens is not a demonstrated proportional latency reduction. **Application:** include preparation, retrieval, embeddings, queues, persistence, failures and useful outcomes. **Confidence:** strong measurement principle; no borrowed population target or cloud bill is established.

<a id="npc-l011"></a>
### NPC-L011 — Share mechanics and calculations before approximating people

Immutable methods, spatial connectivity, candidate indexes and unchanged results can be shared or reused. Frequently updated physical fields need not drag entire biographies through the update path.

**Evidence:** Halo 2's representation, Factorio's belt/path work, FLAME GPU 2 and the official KCD II scaling description. **Failure/cost:** a shared route is not shared permission or knowledge; a stale index is not authority. Maintaining elaborate caches can exceed the work saved. **Application:** identify repeated work at existing owners, with explicit invalidation and a measured consumer. **Confidence:** strong general engineering direction; GPU migration or a distributed process per character is not justified by this research alone.

<a id="npc-l012"></a>
### NPC-L012 — Reduce fidelity along the right dimension

Animation detail, physical resolution, interaction, observation, deliberation and retained evidence can vary independently. Camera distance is not a reliable measure of a person's causal importance.

**Evidence:** crowd systems, large-society activation, KCD's described AI detail levels and coarse simulation research. **Failure/cost:** a distant worker can affect a nearby gathering; another NPC can witness an event the player cannot. Returning to detailed simulation must not manufacture exact intermediate history. **Application:** define what a coarse scene actually establishes and retain its precision. **Confidence:** strong distinction; acceptable approximations require a declared world/product policy and episode tests.

<a id="npc-l013"></a>
### NPC-L013 — Parallel thinking must not create parallel authority

Independent preparation and inference can overlap, but contradictory proposals still need definite outcomes. A response should be checked against facts relevant to that response when it arrives, not rejected merely because anything in the world changed.

**Evidence:** concurrent agent architectures and parallel discrete-event simulation expose synchronization and causality costs. **Failure/cost:** two decisions spend the same resource; a reply arrives after consent changes; rollback cannot retract what a player saw or assume a paid call is refunded. **Application:** preserve current action/commitment owners, distinguish stale/cancelled/failed/completed work, and avoid automatic paid catch-up. **Confidence:** strong correctness boundary; the right concurrency design depends on the actual bottleneck.

<a id="npc-l014"></a>
### NPC-L014 — A hybrid or a trained shortcut must earn its complexity

Reusable procedures, a small selector, a learned policy and generative reconsideration are alternatives, not a mandatory four-model stack. Skill reuse can be useful without a general planner, and training can reduce runtime cost while retaining the teacher's mistakes.

**Evidence:** Creatures, learned locomotion, Voyager and the society studies; [the focused hybrid-game comparison](../references/intelligent-simulation-verification-notes.md#hybrid-combat-study) supplies an opponent-dependent counterexample. **Failure/cost:** training data, debugging, distribution shift and rare personal exceptions can overwhelm savings. **Application:** compare the simplest credible controller and the current system, not only a weaker straw baseline. **Confidence:** strong evaluation principle; no particular learned model or optimization percentage is recommended.

<a id="npc-l015"></a>
### NPC-L015 — Independent life includes quiet success, refusal and satisfied stopping

A person can finish a purpose, enjoy a familiar activity, care for someone or choose solitude without maximizing productivity or novelty. A companion need not always agree; a scene director need not keep manufacturing trouble.

**Evidence:** the contrast between intentionally helpful L4D companions, authored RPG/Legacy continuity, ordinary life simulations and OpenLegend's accepted character intent. **Failure/cost:** universal hunger/flee/help rules remove meaningful exceptions; constant curiosity rewards can prohibit contentment. **Application:** include a peaceful complete episode and legitimate refusal in qualification, while separating voluntary silence from an exhausted inference budget. **Confidence:** strong fit to the project, not a universal requirement for every game genre.

<a id="npc-l016"></a>
### NPC-L016 — Evaluate the rare meaningful exception and the later return

Average agreement can look excellent while the system misses every promise, sentimental possession or justified change of mind. More frequent or more expensive cognition is not an unquestionable oracle.

**Evidence:** the revised 1,052-person study, Simile's calibration work, published society limitations and OpenLegend's recorded stopping failures. **Application:** vary one relevant experience or commitment, preserve permitted knowledge, inspect actual effects and revisit later. Separate natural workload frequency from deliberately constructed edge cases. **Failure/cost:** judging fluent rationales rather than conduct rewards explanation without causation. **Confidence:** strong evaluation design; no complete test suite or live quality measurement was produced in this research task.

## 4. Current OpenLegend baseline and existing design owners

This comparison uses GitHub `Macrofold/OpenLegend` main at `0c12398e32e7c9578e18de07bbe79d39b4827208`, the research branch's base. It is a documentation/evidence reading, not a fresh runtime audit.

| Status at the inspected baseline | What that means for this research |
| --- | --- |
| [Agency](../../../../docs/agent-agency.md) already separates valid native continuation, grounded Decision API selection and generative reconsideration. Automatic person feeding/berry seeking was removed. | Do not propose a generic survival controller as though that design choice had never been made. Extend useful continuation through existing owners. |
| [Required outcomes and personal perspective](../../../../docs/projects/compelling-characters-tech-design.md) are implemented within a bounded qualification slice. Broader stopping and whole-life reliability remain open. | Reliable relevant evidence can matter more than another model call. Existing contrary trials must remain visible. |
| [Character authorship](../../../../docs/projects/compelling-characters-feature-spec.md#character-authorship-and-changing-personality) distinguishes the person from a hidden decision script. | A natural-language routine planted in biography can be just as prescriptive as code. A chosen current plan belongs elsewhere. |
| [Memory architecture](../../../../docs/memory-architecture.md) separates world facts, personal experience, interpretation and executable commitments. | Reuse its evidence and privacy boundaries; do not create another writable mind or narrative outcome log. |
| Its **accepted product-scalability extension** already describes attention before expensive description, low-power cognition, coarse social scenes and explicit participation/time policies. These are not all current execution. | This research strengthens and challenges existing targets rather than claiming to invent or implement them. Existing speech, attention, retention and no-cooldown guarantees remain until changed through their owners. |

[Source and goal map](source-and-goal-map.md#topic-npc) locates the wider design context. The supporting studies' hypothetical mechanisms do not override current contracts, automatically create an ND task or qualify an accepted target as delivered.

## 5. Complete situations and cross-topic consequences

### A. Finish a repair, notice an invitation, and still be the same person tomorrow

**Hypothetical, not an implemented test.** A person has chosen to repair a shelter using designated supplies. They know the method and have permission. A remembered promise makes finishing before a meeting relevant; manageable hunger supplies another concern. Native execution can carry the accepted preparation and work forward without repeatedly asking what the person values.

A nearby companion shows something they made and invites the worker to look. The worker can finish a short safe step, pause, decline, ask to see it later or revise the repair's importance. Which choice fits depends on the person and their permitted evidence, not a universal “social need beats work” rule. The invitation should not mechanically erase the repair.

Suppose a required input is missing. Selecting an ordinary equivalent within the accepted supplies can be routine execution. Taking the companion's keepsake is a new consequential choice even though it would solve the same mechanical problem. The system should expose that difference rather than silently optimize material acquisition.

If the worker pauses, retain actual progress and consumed resources. If they eat, the actual bodily result must reach later decisions; a memory that a meal once happened is not the current fullness value. If they decline, the companion can interpret the refusal without automatically knowing the worker's private reason. A later explanation may change that interpretation.

The satisfying endpoint may be a completed repair and quiet observation, not a new quest. Tomorrow, the remembered invitation or fulfilled promise can affect a relevant choice without being recited in every conversation. Compare a trusted friend, a stranger and a recent misunderstanding while keeping the practical situation otherwise similar. The point is a coherent range of outcomes, not a required friendly answer.

### B. A crowded gathering should not require a million private facts

**Hypothetical.** Several people independently agree to attend a meal. Preparation has real supplies, labor and time. A coarse account of an ordinary social beat might preserve that an exchange occurred and its gist under an accepted fidelity policy, without inventing exact spoken words.

One participant arrives after hearing a rumor. Another did not hear it. A joint scene generator should not leak the rumor to everyone or infer unanimous agreement. If exact phrasing matters to an accusation or promise, that language needs the corresponding precise evidence rather than a later plausible reconstruction.

A supply failure or urgent observation can require more detailed choices. The gathering need not become a crisis merely to appear alive. Some people can continue eating, help, leave, disagree or enjoy a quiet corner. Resource transfers and commitments still use real world authority, including when decisions are prepared concurrently.

Later inquiry can receive an honest account of imperfect recall. A person not simulated as witnessing an exact event cannot produce an exact eyewitness transcript. The cost comparison should include preparation, perception, memory and queue bursts, while checking that quiet participants are not indefinitely deprived of any opportunity to choose.

### C. A recurring adversary is not only a harder opponent

**Hypothetical.** A person recognizes someone involved in an earlier conflict. A visible scar or remembered action can make the encounter legible, but need not predetermine revenge. An apology, changed allegiance, a shared concern or a refusal to reconcile can matter.

A native combat routine may competently execute an accepted defensive intention. Whether to accept surrender, protect someone else or end the pursuit belongs to a potentially different choice. Generated speech cannot retroactively make an earlier injury intentional or erase an actual debt. The successful endpoint can be separation or peace; repeated conflict is not the only evidence of a durable relationship.

## 6. Alternatives, applications and burdens

**Start by reusing explicit choices.** A bounded known activity is easier to audit than a broad inferred habit. Inspect unnecessary repeated preparation and missing outcomes before adding a model to route other models. This is a research recommendation, not implementation authorization.

**Keep simpler alternatives live.** A short fixed procedure may beat search; a contextual direct action may beat free text; a small cast may offer more meaningful relationships than a huge crowd. A world can intentionally contain simpler organisms or anonymous ambience without claiming those entities are equivalent reflective minds.

**Learned routines are a later comparison, not an automatic upgrade.** Cached choices need appropriate context and invalidation. A new relationship or remembered promise can make yesterday's obvious answer wrong. Training a model or rule learner adds data, evaluation and maintenance costs; familiarity alone does not establish safe reuse.

**Cost and latency must follow the world/time promise.** Continuing authorized work can hide some inference delay, but the engine should not let an unrelated fallback decide a consequential question while the model waits. Faster fictional time can increase the number of choices required per real second. Overload, unavailable providers and spending limits should remain explicit, not masquerade as a character choosing silence.

**Bodies and interactions remain real.** Unnoticed bodies still collide; unconsidered resources can still be consumed by someone else. Any optimization that changes those outcomes is a fidelity or world-rule choice. It needs its own declared boundary rather than the claim that an invisible calculation cannot matter.

## 7. Open questions and evidence that could change these recommendations

The largest unresolved question is detecting semantic novelty cheaply: what matters can depend on a memory not currently retrieved. Another is measuring independent character fidelity without demanding one author-approved response. Both require actual episodes and competing plausible outcomes, not only model confidence or prose quality.

Population studies leave important gaps: interactive latency, long-running world effects, uncommon personalities and persistence across absences are not all validated by survey prediction or social-media experiments. Several game techniques remain known only through descriptions; precise implementations and workloads could qualify the transfer.

The proposed emphasis on continuation should change if profiling finds a different dominant cost, if maintaining dependency checks is more expensive than reevaluation, or if delayed reconsideration systematically misses personally consequential changes. Broader planning should be rejected where symbolic authoring becomes more complex than the decisions it replaces. Approximate scenes should be narrowed where their missing detail repeatedly becomes important later.

No live game, language-agent deployment, paid model experiment, player study or OpenLegend benchmark was run for this pass. Source confidence and actual inspected scope remain in the linked studies and assessment records. Broader NPC-topic work, including deeper family, romance, teaching and animal-bond comparisons, is not silently completed by this intelligence-focused research.

## 8. OpenLegend-specific research subtopics and design mapping

These identifiers organize research, not executable modules or newly approved projects. Existing design status stays with the linked owners. No new ND identifier is allocated by this pass.

| Subtopic ID | Intended experience and scope | Research lesson / evidence | Design register entry | Feature specification | Technical design |
| ----------- | ----------------------------- | -------------------------- | --------------------- | --------------------- | ---------------- |
| NPC-R01 | A person chooses, follows through and can change their mind. | NPC-L001–L004, L015; game activities and temporal abstraction. | Existing [character-experience owner](../../../../docs/maintainers/character-experience.md); no new entry. | [Continuing lives §16](../../../../docs/projects/continuing-lives-feature-spec.md#16-research-refinement--a-chosen-life-can-continue-and-change), alongside compelling characters and agency. | [Continuing-life technical §§3–4](../../../../docs/projects/continuing-lives-tech-design.md#3-express-the-actual-choice-with-existing-composition): existing chosen methods, bounds, interruption and personal attention; design only, selected numerical reactions through the existing feeling owner. |
| NPC-R02 | A past experience affects later relationships without rewriting facts. | NPC-L006–L008, L016; memory and individual-response research. | Existing character/memory ownership; no new entry. | [Continuing-life personal consequences](../../../../docs/projects/continuing-lives-feature-spec.md#16-research-refinement--a-chosen-life-can-continue-and-change), with existing memory/perspective contracts. | [Technical §5](../../../../docs/projects/continuing-lives-tech-design.md#5-later-conduct-uses-the-same-evidence-and-interpretation-owners): source-linked interpretation, rumor origin, correction and later retrieval; no second history store; selected numerical reactions retain world-owned meaning. |
| NPC-R03 | Quiet or unusual meaning gets attention without constant deliberation. | NPC-L004–L005, L015; calibration and attention tradeoffs. | Existing character, agency and [product-scalability owners](../../../../docs/maintainers/product-scalability.md); no new entry. | [Continuing-life attention](../../../../docs/projects/continuing-lives-feature-spec.md#16-research-refinement--a-chosen-life-can-continue-and-change) and [evaluation feature](../../../../docs/projects/intelligent-simulation-evaluation-feature-spec.md). | [Existing-intake design](../../../../docs/projects/continuing-lives-tech-design.md#4-reconsideration-resumption-and-attention) and [conditional routing comparison](../../../../docs/projects/intelligent-simulation-evaluation-tech-design.md#conditional-routing-and-calibration); no new scheduler, gate, model or interval selected. |
| NPC-R04 | Many continuing people remain coherent at declared fidelity. | NPC-L010–L013; simulation, crowds and language-agent societies. | Existing product-scalability owner; no new entry. | [Scalability research refinement](../../../../docs/projects/product-scalability-feature-spec.md#8-intelligencesimulation-research-refinement--october-15-2026) and [complete-path evaluation](../../../../docs/projects/intelligent-simulation-evaluation-feature-spec.md). | [Scalability technical §11](../../../../docs/projects/product-scalability-tech-design.md#11-research-refinement-one-authoritative-world-under-efficient-execution) and [measurement design](../../../../docs/projects/intelligent-simulation-evaluation-tech-design.md); exact calculated first families selected, no GPU/distributed runtime or capacity claim. |
| NPC-R05 | Companions and strangers are understandable without compulsory helpfulness. | NPC-L007–L009, L015–L016; social practices, embodied behavior and human-experience studies. | Existing character-experience/social owners; no new entry. | [Attention and scenes §18](../../../../docs/projects/attention-and-scenes-feature-spec.md#18-research-refinement--independent-shared-activity-that-people-can-understand). | [Shared-activity technical counterpart](../../../../docs/projects/attention-and-scenes-tech-design.md): independent exact consent, divergent knowledge and readable actual progress; no new social ontology or scene authority, compact expressive background contributions selected, with independently private numerical reactions. |

## 9. Coverage and source navigation

**October 15 design handoff:** the [shared coverage map](../../../../docs/maintainers/intelligent-simulation.md) links all nine completed selected designs and Mike's resolved exact-calculation, compact-communication and numerical-reaction choices. These design references do not revise the research findings, select every proposed technique, or establish implementation or live quality.

The [game implementation supplement](../references/game-ai-implementation-and-scale.md) reassesses 21 existing dossiers and connects nine topic-only additions, one of which fills the previously queued G159 slot. The [language-model study](../references/language-model-societies-and-simile.md) covers Simile, generative agents, learned skills and large societies. The [simulation study](../references/efficient-individual-simulation.md) covers temporal abstraction, event scheduling, metareasoning, representation, movement, concurrency, fidelity and measurement. [Verification notes](../references/intelligent-simulation-verification-notes.md) retain a direct hybrid-game counterexample and source corrections.

The matrix remains the status owner; [assessment records](assessment-records.md) link each incorporated game's actual scope to the stable lessons above. A topic-only dossier is not a full-game completion, and a filled guide is not a completed assessment of every possible source. This pass changes research coverage and analysis, not runtime behavior or accepted project priorities.
