# Beyond the dossiers — games in the AI era

**Research expansion, October 14, 2026.** Companion to the [main synthesis](../essays/fun-and-sustainable-engagement.md), [theory critique](fun-research-expansion-theory.md) and [mobile/recent-game cases](fun-research-expansion-mobile-and-recent.md). This paper separates observed human experience, prototype capability, product descriptions and our OpenLegend hypotheses. It does not propose a replacement engine architecture, authorize paid calls or certify the current game's AI quality.

## 1. The useful question is what participation becomes possible

“Uses AI” is not an experience category. An authoring assistant, a talking character, an independent actor, an invented executable object and a generated navigable image solve different problems. A game may benefit from one without needing the others. The appropriate comparison is the same desired activity with a strong alternative—not an artificially inconvenient non-AI baseline or a different game with less content.

| Use | Possible player value — our hypothesis | Principal question to test |
| --- | --- | --- |
| Authoring and modding assistance | More people can express and revise an idea. | Does the creator retain control, obtain a usable result and find an audience? |
| Flexible dialogue | Express a personally chosen intention or interpretation without guessing a menu label. | Is the reply relevant, understandable, consistent with the character and worth the effort of speaking or typing? |
| Independent character decisions | Negotiate with someone whose own purpose makes their behavior consequential. | Does the actor actually pursue that purpose, perceive the relevant event and respond intelligibly rather than simply agree? |
| Runtime invention within supported rules | A proposed tool or technique creates a genuinely useful alternative. | Can it be realized, used again and learned as a stable capability—not merely narrated? |
| Generated visual environments | Explore or remix an imagined setting. | Does navigable appearance also have the persistent, controllable consequences this game's promise requires? |

The distinctions are ours; the sources below supply bounded examples and comparisons. AI-generated novelty, successful tool execution and enjoyment must be measured separately. The older dossier evidence still matters: expressive authored games and compact rule systems remain important comparisons in the AI era.

<a id="human-evidence"></a>
## 2. Human evidence: promising, mixed and task-dependent

<a id="a01"></a>
### A01 — Open-ended dialogue can increase involvement in a particular RPG

**Source:** Rasmus Ploug, Emil Rimer, Anthon Kristian Skov Petersen and Marco Scirea, *Open-Ended NPC Dialogue Favors Casual Players: A Pilot Comparison of Three LLM-Driven Dialogue Systems*, IEEE Conference on Games, August 2025. [Publisher](https://ieeexplore.ieee.org/document/11114150/) · [institutional record](https://portal.findresearcher.sdu.dk/en/publications/open-ended-npc-dialogue-favors-casual-players-a-pilot-comparison-/) · DOI `10.1109/CoG64752.2025.11114150`.

**Inspected:** publisher and institutional abstracts, not full methods. Four designs—static control, rephrasing, hybrid and open-ended—were compared in a custom RPG with 64 participants. The authors report longer dialogue and greater engagement for open-ended interaction, particularly among participants classified as casual players. This supports investigating expressive dialogue, not a universal demographic rule or demonstrated long-term retention. Longer interaction could have several causes; the reported experience measures are important alongside duration.

<a id="a02"></a>
### A02 — More freedom can also mean more work and less trust

**Source:** [*The Double-Edged Sword of Open-Ended Interaction: How LLM-Driven NPCs Affect Players' Cognitive Load and Gaming Experience*](https://arxiv.org/abs/2604.10107), April 2026 preprint.

**Inspected:** author abstract; full HTML retrieval was unavailable. A randomized between-subject study with 130 participants used the Campus Culture Week prototype. The authors report greater cognitive load with LLM characters, with expressive effort and uncertainty about replies implicated. Autonomy improved while usability and trust suffered; the overall experience comparison was not statistically significant. This does not establish equivalence, prove every AI interface is worse, or directly replicate A01's different task and design.

**Our inference from A01–A02:** expressive freedom has an interaction cost. People may welcome inventing a response during role-play but prefer a direct action when trying to buy an item or leave. An empty text box should not be treated as universally more accessible than a contextual choice. Nor should negative findings be used to eliminate a genuinely valued expressive route. Compare both under the particular activity and audience.

<a id="a03"></a>
### A03 — Talking-to-Build: compare against the right baseline

**Source:** Xin Sun and colleagues, [*Talking-to-Build: How LLM-Assisted Interface Shapes Player Performance and Experience in Minecraft*](https://arxiv.org/abs/2507.20300), 2025 preprint; [inspected HTML version](https://arxiv.org/html/2507.20300v1).

**Inspected:** methods and results in the paper body as well as abstract. Thirty participants undertook counterbalanced building tasks using an LLM interface and a command interface. The setting was a flat creative Minecraft environment, not a survival campaign. Overall game-experience ratings improved; overall usability differences did not meet conventional statistical significance, although some task-specific results favored the assistant. The authors' broader abstract should not erase that distinction.

The comparison concerns command entry, not proof of superiority over excellent direct manipulation. Complex instructions and imperfect interpretation remained important. **Our use:** evaluate a player's idea becoming a usable object, but compare language with concise contextual actions and direct controls where those already work. Reduced syntax burden is not equivalent to enjoyable invention, and building quickly is not necessarily the creator's only goal.

<a id="a04"></a>
### A04 — Contextualized generation: outputs need a role in the game

**Source:** Ming Yin and colleagues, *How Contextualized Generative AI Shapes Player Experience in Games*, *Entertainment Computing* 58, September 2026. [Publisher abstract](https://www.sciencedirect.com/science/article/abs/pii/S1875952126001163) · [DOI 10.1016/j.entcom.2026.101194](https://doi.org/10.1016/j.entcom.2026.101194).

**Inspected:** indexed publisher abstract and article-body sections; direct page rendering failed. In a 2 × 2 within-subject study of 72 participants, dynamic item status and adaptive character dialogue each improved reported presence, autonomy and enjoyment in a short 2D farming prototype. No statistically significant interaction was detected; this must not become a claim of super-additive synergy or proof of independence.

**Our use:** this is a closer match to OpenLegend's useful-invention question than a demonstration of fluent prose alone. It motivates comparing outputs that affect supported play with equally polished but functionally irrelevant outputs. Its single prototype and short task do not establish universal 3D behavior, enduring enjoyment, commercial viability or broad physics generation.

<a id="a05"></a>
### A05 — Conversation timing is not one latency number

**Source:** [*When NPCs Take Their Time: Token Latency Effects in LLM-Driven Game Conversations*](https://doi.org/10.1016/j.entcom.2026.101213), *Entertainment Computing* 58, September 2026.

**Inspected:** indexed publisher abstract, highlights and introductory methods description. A 34-participant study varied initial delay and streamed-output pace across four values each in a simulated RPG conversation environment. Output pace produced more pronounced differences than initial delay; the highest delays tended to hurt experience, while moderate pacing was sometimes preferred over instant output. Character personality also mattered.

**Our use:** evaluate the time until the player can understand and act, not just the first token. Reading burden, interruptions and whether the player can keep participating belong in that evaluation. This is not an optimal delay specification for OpenLegend or a reason to insert artificial waits everywhere. Quiet textual conversation, voiced dialogue and an urgent encounter can require different timing.

<a id="a06"></a>
### A06 — Role-sensitive constraints: distinguish human findings from model ratings

**Source:** Vanessa Figueiredo and David Elumeze, [*Symbolically Scaffolded Play: Designing Role-Sensitive Prompts for Generative NPC Dialogue*](https://arxiv.org/abs/2510.25820), October 2025 preprint; [paper body](https://arxiv.org/html/2510.25820v1).

**Inspected:** paper methods and comparative evaluation sections. Its main human comparison involved ten participants, following a separate five-person formative pilot. Participants compared higher- and lower-constraint versions of an interrogation prototype. Subsequent hybrid prompting and retrieval comparisons also used model-based evaluation. The small human study does not establish a broadly superior constraint strategy; model-rated role differences are not a human enjoyment result.

**Our use:** a clue-giver must preserve essential information; a suspect may legitimately be evasive. Constrain factual continuity and actual effects without requiring identical dialogue style from every role. This does not authorize unreliable world truth or omniscient character knowledge. A deliberate lie inside a coherent fiction is different from the software accidentally changing who committed the crime.

<a id="a07"></a>
### A07 — StarCharM: creation is its own kind of play

**Source:** Hamid Zand Miralvand and colleagues, *Democratizing Game Modding with GenAI: A Case Study of StarCharM, a Stardew Valley Character Maker*, *Proceedings of the ACM on Human-Computer Interaction* 9(6), October 5, 2025. [DOI 10.1145/3748612](https://doi.org/10.1145/3748612) · [author preprint](https://arxiv.org/abs/2507.13951).

**Inspected:** publisher and author abstracts. Ten Stardew Valley players tried iterative character-mod creation with fine-grained controls. They welcomed expressing their ideas but reported difficulty realizing complex visions and concerns about originality and community participation. These are small-study accounts, not proof of an automatic diverse creator economy.

**Our use:** generation should support selecting, rejecting and revising, not just produce more assets. Creating a person for a world and playing a character inside that world are different authority modes. OpenLegend should not give the embodied player arbitrary author control merely because both interfaces can accept language. Compatibility, credit, curation and whether another person enjoys the result remain separate questions.

<a id="a08"></a>
### A08 — Generative Agents: believable activity is not yet demonstrated game value

**Source:** Joon Sung Park and colleagues, *Generative Agents: Interactive Simulacra of Human Behavior*, UIST 2023. [Published record](https://doi.org/10.1145/3586183.3606763) · [author version](https://arxiv.org/abs/2304.03442).

**Inspected:** published and author abstracts. The work places 25 agents in a small simulated town and examines believable individual and emergent social behavior, including coordinated attendance at a party. Ablations investigate contributions of observation, planning and reflection. Those are valuable behavioral results, not a demonstrated enjoyable adventure or production-scale persistence guarantee.

**Our use:** someone independently doing something can make a world legible and surprising, but the player still needs a reason to notice or participate. More offscreen activity is not automatically a better game. For an OpenLegend encounter, test the particular actor's own purpose and its visible consequence rather than counting simulated conversations or treating synthetic populations as substitute playtesters.

## 3. Products and demonstrations: what is actually being offered

<a id="a09"></a>
### A09 — Suck Up!: language inside a recognizable predicament

**Sources:** Proxima's [official game site](https://www.playsuckup.com/) and [Steam product description](https://store.steampowered.com/app/2726370/Suck_Up/), inspected October 14, 2026. Steam records its release there as October 1, 2025; this is not asserted to be the game's first availability anywhere.

The vampire premise gives conversation an objective: gain the confidence and access needed to feed without being caught. The official site separately presents other modes and character creation/sharing. **Our interpretation:** a bounded situation can make open language purposeful; a player need not first invent an entire reason to talk. However, an amusing response or a successful invitation does not prove the persuasion rules remain fair, coherent or interesting on repetition. This run did not play the game, test its service or audit its entire review population.

<a id="a10"></a>
### A10 — Ubisoft Teammates: a playable research experiment, not a shipped-game result

**Source:** Ubisoft, [*Ubisoft Reveals Teammates — An AI Experiment to Change the Game*](https://news.ubisoft.com/it-it/article/3mWlITIuWuu0MoVuR6o8ps/ubisoft-reveals-teammates-an-ai-experiment-to-change-the-game), November 21, 2025. The localized URL returned English article text.

**Inspected:** announcement text, not video playback or the prototype. Ubisoft describes natural voice interaction with an assistant and accompanying characters that respond through dialogue and actions. **Our inference:** contextual orders can reduce command-search work while retaining a concrete activity. The announcement is evidence of the experiment's intended interaction, not comparative proof that it is enjoyable, a generally available feature in another Ubisoft title, or a reason OpenLegend should become an omnipotent assistant interface.

<a id="a11"></a>
### A11 — Genie 3 and Project Genie: visual possibility is not a durable world contract

**Sources:** Google DeepMind, [Genie 3 announcement](https://deepmind.google/blog/genie-3-a-new-frontier-for-world-models/), August 5, 2025; [Project Genie launch](https://blog.google/innovation-and-ai/models-and-research/google-deepmind/project-genie/), January 29, 2026; [Street View and access expansion](https://blog.google/innovation-and-ai/models-and-research/google-deepmind/project-genie-expands/), May 19, 2026.

**Inspected:** official articles, not a hands-on session. The model announcement describes navigable generated environments with limited interaction duration and action/agent limitations. The January prototype specifies 60-second generations and control/physics limitations; May expands grounding and access. The January availability restriction is therefore not a complete October availability claim, and its generation cap is retained as launch evidence rather than independently retested current behavior.

**Our inference:** these are significant possibilities for exploring and remixing appearances. They do not themselves establish stable inventory, ownership, independent characters or multi-session consequences. OpenLegend's claim that a made tool remains usable requires evidence about that tool's rules and history, not merely a convincing video of it being used. Generated visual scenes and authoritative simulation are different research targets, not rival labels for the same achievement.

## 4. Learnings to carry into the main principles

These are **our cross-source hypotheses**, not newly measured effects.

**A supported language space is better than an implied unlimited promise.** Make examples of valid intentions discoverable; let players use direct actions for routine tasks. Free input should remain useful when it adds expression or a new approach, not become a syntax test or the only way to find an ordinary command. Sources A01–A04 motivate comparing this tradeoff; none establishes that a hybrid is universally best.

**Novelty needs stable consequences.** A surprising object can enlarge the action vocabulary only if its behavior can subsequently be learned. Novel descriptions with identical outcomes are weak evidence of invention; changing an object's behavior opportunistically after the player relies on it undermines mastery. This links contextualized generation in A04 to the theory paper's pattern-learning questions.

**Coherent disagreement is more interesting than indiscriminate agreement.** A character can reject a request because it conflicts with an understandable purpose, reveal incomplete evidence, or change their mind after a relevant event. Do not conflate this with a model refusing an otherwise supported request unpredictably. The character's social uncertainty belongs inside the fiction; accidental rule uncertainty belongs to the implementation's quality problems. A06 and A08 are relevant precedents, not validation of a universal personality system.

**More content creates selection and integration work.** Generation may reduce drafting effort while increasing the work of selecting, correcting, organizing and remembering. Evaluate the player's ability to make something they endorse, not only objects created per minute. A07's mixed creator accounts are a useful warning against treating output volume as creative empowerment.

**The cost is attention as well as computation.** Prompt composition, waiting, reading and correcting can consume the time intended for adventuring. Ask whether each AI turn creates a new option, an interpretable consequence, a wanted performance or a useful relationship moment. A02 and A05 support studying those costs, not eliminating all slow conversations. Financial cost and service interruption should also be explicit; these are operational design considerations, not prices measured in this run.

**Generation must earn its place against good authored alternatives.** Test whether an authored encounter with excellent responses already provides the desired value. AI may be worthwhile precisely where the player supplies an unanticipated intention, where a remembered event changes a relationship, or where an accepted invention becomes usable. More fluent exposition of a fixed result is not automatically a strong reason to add runtime generation.

## 5. Mapping to OpenLegend without mistaking targets for delivered behavior

The pinned [repository README](https://github.com/Macrofold/OpenLegend/blob/1700f3b23a39acfdd14f3a6ab34c8ce330847bc3/README.md) documents native interaction and a finite, checked recipe-invention route. The [product priorities](https://github.com/Macrofold/OpenLegend/blob/1700f3b23a39acfdd14f3a6ab34c8ce330847bc3/docs/repertoires/gameplay-priorities.md) require a small genuine instance of invention and independent, observation-grounded character consequence in the playable adventure. This is a documentation snapshot, not a fresh playtest or permission to claim all target behavior is delivered.

| Research question | Existing direction to preserve | Proposed comparison, not a new feature commitment |
| --- | --- | --- |
| Does language improve expressing a useful intent? | Existing ordinary actions remain valid; invention is optional. | Compare concise direct actions with language for routine work, then compare them for a genuinely novel supported request. |
| Does an invention change play? | Proposal, admission, construction and actual use are distinct. | Follow one accepted invention through acquisition of inputs, realization and two different uses; distinguish surface novelty from changed possibilities. |
| Does a person feel independent and comprehensible? | A character has their own aim and only actor-permitted information. | Observe acceptance, refusal and revision after a legitimately perceived consequence; ask the player to explain the cause without requiring access to private thought. |
| Does memory improve a later encounter? | A recorded claim is not automatically a verified fact. | Return after another activity and check accurate recognition, relevant changed behavior and whether the player values it. More recitation is not the success criterion. |
| Does AI preserve participation during failure? | Technical unavailability is not fictional success or punishment. | Study unavailable service, rejected proposals and delayed results separately from the character's in-world opposition; never award a fabricated effect to make the demo look complete. |
| Does creation support authorship? | Creator authority and embodied action remain separate. | Let a creator assess, revise or decline generated material; separately ask a player whether encountering it yields good play. |

**A useful success observation:** the player can explain what was new, why it worked, which limit mattered, what another actor contributed and why they would use or revisit the result. **A useful failure observation:** they repeatedly rephrase until a model yields, cannot predict a second use, or see an impressive story that did not actually change the world. These are proposed qualitative observations, not a combined numerical score.

## 6. Evaluation and remaining uncertainty

Use the same task, comparable content and a strong baseline. Counterbalance exposure where practicable, distinguish novice genre knowledge from unfamiliarity with AI, and report performance, usability, enjoyment, cognitive burden and trust separately. Return for a later session to examine whether novelty survives learning and whether earlier facts and capabilities remain coherent. No sample size or statistical power calculation is invented here.

Human evidence remains small, task-specific and often short-term; some central work is a preprint. Abstract-only sources cannot support a full methodological appraisal. The generative-farming, Minecraft-command and dialogue studies test different interventions and are not pooled into an effect size. Model judges and scripted test actors can check some consistency properties but do not establish human fun, willingness to return or emotional attachment. Vendor demonstrations establish their stated capability and limits, not mass-audience outcomes.

No games, prototypes, videos or paid model services were run for this paper. Publication dates are distinguished from product-release dates and evolving access. Source failures remain explicit. The main essay adopts these as sharper research questions and bounded principles, not as proof that adding AI will make OpenLegend fun.
