# Architectures and papers for grounded, responsive NPC cognition

Research date: **October 20, 2026**. This is a selective primary-source research panel, not a claim to have exhaustively surveyed every publication or identified a universal state-of-the-art NPC. Paper results are author-reported; none was reproduced here. Reading depth is recorded below and in the [source audit](07-source-register-and-open-questions.md).

## 1. The architectural distinction that matters most

Separate **what the world does**, **what this actor perceives**, **what this actor chooses**, and **how that choice is expressed**. The Kevin and Mantella source inspections demonstrate why those cannot be collapsed into one language-model loop. A fluent speaker can lack its own current attack state; a mechanically competent fighter can operate while a slow dialogue model is still generating.

Our recommended comparison architecture is a hierarchy of responsibilities, not a proposal for four new services:

| Responsibility | Candidate implementation | Trigger and boundary |
| --- | --- | --- |
| Physical consequences and execution | Existing native mechanics, navigation and admitted activity continuation | Actual simulation boundaries; no semantic request for every primitive. |
| Perception and attention | Actor-scoped event/state projection, native change detection, optional semantic relevance | Material changes and chosen review conditions; perception does not automatically require a reply. |
| Choice | Current decision provider, a small local decision model, or a justified generative route | A meaningful unresolved choice; finite exact options and truthful uncertainty. |
| Expression and reflection | Character-conditioned dialogue, optional prosody, separately scheduled memory work | Actual communication or useful reconsideration; no mandatory thought, narration or speech per action. |

OpenLegend already has relevant owners and substantial foundations. This research does not authorize replacing them with a parallel “nervous system,” planner, memory database or scheduler. The [design-preparation map](../../../docs/maintainers/npc-cognition-research-needs-design.md) identifies the specific remaining questions.

## 2. Architecture families and their tradeoffs

### Native-state hybrid agents

A game bridge supplies structured state or readable actor-permitted descriptions; a model chooses a high-level supported action; a native controller executes it and reports outcomes. Kevin is a direct source-level example. This route can be fast, exact about geometry/resources and easy to inspect. Its weakness is coverage: an unreported state change may effectively not exist to cognition. An unfiltered state dump creates omniscience instead.

For OpenLegend, this is the strongest initial architecture hypothesis because the engine already owns the world. The useful improvement is better evidence, context selection, continued activity and timely choices—not forcing the model to rediscover a known inventory through pixels. See [Kevin](01-kevin-source-reconstruction.md) and [Mantella](02-mantella-and-npc-systems.md).

### Screenshot-and-controls agents

[Cradle, 2024](https://arxiv.org/abs/2403.03186) studies a general computer-control framework using screenshots and keyboard/mouse actions, with perception, planning, reflection, memory and skill components. Its value is portability when application internals are unavailable. Its evidence does not establish that screenshots are the cheapest or most accurate interface when the simulation is ours. **Reading: primary abstract.**

[Set-of-Mark, 2023](https://arxiv.org/abs/2310.11441) demonstrates marking image regions to improve grounded references. For an NPC, a related technique is to overlay actor-permitted candidate places and ask for a handle, leaving coordinates and reachability to native code. This transfer is an inference; the paper's referring-expression tasks do not establish navigation competence. **Reading: primary abstract.**

[SIMA 2, November 13, 2025](https://deepmind.google/blog/sima-2-an-agent-that-plays-reasons-and-learns-with-you-in-virtual-3d-worlds/) combines a Gemini-based agent with screen-level interaction across virtual worlds and describes generalization and self-improvement research. It is important evidence that learned general game interaction goes beyond hand-written per-game commands. The reviewed announcement does not establish a downloadable production-ready SIMA NPC model or an OpenRouter endpoint. Its trained agent system is not equivalent to buying a generic Gemini call. **Reading: first-party research announcement.**

Our proposed use of pixels is selective: novel appearance, reading a legitimately visible surface, interpreting a gesture not otherwise represented, or testing whether the rendered scene matches its semantic projection. A debug screenshot can audit rendering without becoming an NPC observation. For normal world facts, compare structured evidence first.

### Skill libraries and tool-using planners

[SayCan, 2022](https://arxiv.org/abs/2204.01691) combines language-model usefulness with skill feasibility estimates in robotics. Its central separation is relevant: a desirable action is not necessarily executable. OpenLegend should use actual native prerequisite checks where available, not replace them with a learned probability. A skill's estimated success remains distinct from authority to perform it. **Reading: primary abstract.**

[ReAct, 2022](https://arxiv.org/abs/2210.03629) interleaves model reasoning and environment actions/feedback. It motivates bounded investigation when an actor needs information, but not mandatory multi-step reasoning for greetings, footsteps or a known meal. A successful tool trace is evidence for that task, not permission to invent another participant's response. **Reading: primary abstract.**

[Voyager, 2023](https://arxiv.org/abs/2305.16291) uses an automatic curriculum, an executable skill library and iterative feedback in Minecraft. Reusable skills are a useful alternative to repeatedly rediscovering the same method. Its open-ended exploration objective is not a resident's personality, and generated code is not automatically safe to run in an authoritative server. OpenLegend's existing admitted methods and capability boundaries remain controlling. **Reading: primary abstract.**

Distinguish three forms of learning: adding a memory, acquiring a validated executable method, and updating model weights. Journal entries and retrieved experience cards accomplish the first; they do not prove the other two. An actor-authored intention may suggest a future habit, but a developer-authored conditional biography must not be presented as independently formed motivation.

### Role-aligned hierarchies at different time scales

[STRATA, September 30, 2026](https://arxiv.org/html/2609.38881v1) separates strategic, logistics, tactical and post-match review agents for Red Alert. Experience cards are proposed from traces, then validated/revised using later matches. Its reported increase from 30% to 100% wins is confined to a fixed scenario; the limitations identify one map, one seed, one decision model and limited matches. This is evidence for a promising decomposition, not a universal result. **Reading: primary abstract plus HTML architecture and limitations.**

For OpenLegend, the transferable question is whether an expensive longer-horizon choice can leave a precise, revisable objective for cheaper execution. Do not copy a global strategic agent's knowledge into a resident. Do not create four model calls where a single native continuation already works. Experience cards would require source provenance, contextual applicability and rejection of contradicted advice, rather than an ever-growing instruction pile.

### Integrated commercial and local inference stacks

[NVIDIA ACE](https://developer.nvidia.com/ace-for-games) is a component suite rather than one model that solves cognition, voice, memory and animation. The [in-game inference SDK article](https://developer.nvidia.com/blog/bring-nvidia-ace-ai-characters-to-games-with-the-new-in-game-inference-sdk) describes embedding inference alongside game workloads. The relevant lesson is resource scheduling and reusable components, not automatic suitability for OpenLegend's browser client or authoritative server. **Reading: first-party product and technical articles; not installed.**

A local model can reduce network delay and improve privacy, yet still contend with rendering and speech synthesis. A hosted small model can be faster than a poorly configured local one. Deployment choice must use the real concurrency and context distribution, not a warm single-prompt showcase.

## 3. Cheap judgment is a separate research axis

[Kev's primary card](https://huggingface.co/jaredpalmer/kev-4b) and the current [OpenRouter listing](https://openrouter.ai/jaredpalmer/kev-4b) make a bounded local decision model a concrete candidate, not a hypothetical small chatbot. The exact mechanism and deployment qualifications are in [the model dossier](04-models-local-hosted-openrouter.md).

A much smaller fixed-label classifier is also worth comparing when the task really has a stable label space. [SetFit](https://huggingface.co/docs/setfit/index) provides few-shot sentence-transformer classification and an ONNX deployment path. It is not a general replacement for dynamic action selection, complex character judgment or numerical mechanics. Its value would be demonstrated by accepted-error coverage on a named routing problem, not by a sentiment benchmark. **Reading: official framework documentation.**

The appropriate sequence is native known conditions, current baseline, then candidate classifier/decision model. Keep an abstention or unresolved outcome. Test negation, quoted instructions, hypothetical speech, conflicting commitments, unseen names and changed action lists. A model can emit a perfectly valid offered option for the wrong reason; schema validity is not semantic correctness.

The cheapest architecture can be the one with fewer gates. An inexpensive classifier in front of every request can increase total latency and still miss consequential cases. Compare end-to-end quality and total work, including the cost of rerouting false negatives and of assembling each gate's context. Keep independent questions batchable and dependent questions sequential only where necessary.

## 4. Memory: useful advances without a second canonical mind

OpenLegend already has actor-specific experience, knowledge, required recall, consolidation and a prior [Hindsight evaluation](../hindsight-memory-evaluation.md). The following papers suggest candidate improvements at those boundaries, not a reason to replace the whole system.

### Foundational generative agents

[Generative Agents, 2023](https://arxiv.org/abs/2304.03442) links remembered observations, retrieval, reflection and planning in a small simulated community. Its ablations support studying the contribution of those components to believable behavior. It does not prove real-time combat, scalable persistent hosting, secure private knowledge or subjective consciousness. **Reading: primary abstract; use the original paper for detailed replication.**

A relevant OpenLegend test is whether a specific previous encounter changes a later voluntary choice. A generated reflection paragraph without subsequent behavioral consequences does not establish useful memory.

### Temporal and hierarchical recall

[TiMem, January 6, 2026; revised April 30](https://arxiv.org/abs/2601.02845) organizes raw dialogue and increasingly abstract representations in a temporal memory tree, with complexity-aware recall. Its proposal suggests selecting the level of detail needed for a current question. A derived persona is an interpretation of evidence, not authority to overwrite a person's accepted identity or the original event. **Reading: primary abstract and version metadata.**

### Consolidation at meaningful segments

[LycheeMemory V2, August 13, 2026; revised October 14](https://arxiv.org/html/2608.12990v2) batches related exchanges into semantic segments and emits typed, provenance-linked records with entity, topic and temporal indexes. A query planner selects retrieval routes. Its limitations explicitly leave end-to-end latency, storage growth and continuous deployment unmeasured and report weaker preference-intensive results. The main accuracy numbers use particular reader, embedding and reranker choices; they cannot be compared uncritically with another paper's headline. **Reading: HTML method, evaluation framing and limitations.**

The OpenLegend hypothesis is narrower: can native event/episode boundaries plus bounded semantic help reduce repeated maintenance calls without losing exact important incidents? Compare with current consolidation and a modest fixed-window/native-boundary baseline. A semantic segmentation call on every line could simply move cost to another stage.

### Associative retrieval beyond nearest neighbors

[MemCode, October 14, 2026](https://arxiv.org/html/2610.19472v1) writes source-linked atomic memory units and supplements dense retrieval with a learned discrete codebook and co-occurrence path. Its inspected method uses a bounded one-hop expansion and reconstructs original spans through source pointers. It explicitly targets retrieval-intensive dialogue memory, not fully deployed planning/tool agents, and warns that extraction can distort motivations, emotion and pragmatic meaning. **Reading: HTML methodology and limitations.**

For OpenLegend, test additional recall candidates before accepting generated memory rewrites. Keep exact speech, important incidents and current obligations available independently. The paper's asset register includes non-commercial dataset restrictions; code/model/data permissions require separate review before commercial training or reuse. Faster batch memory construction is not evidence of subsecond decision latency.

### Retrieval-driven reconsolidation

[REALM, September 13, 2026](https://arxiv.org/abs/2609.16053) proposes a heterogeneous memory graph and retrieval-feedback-driven reorganization. It suggests that repeated recall failures can inform future indexing instead of only appending new notes. However, every read becoming a write raises lifecycle, concurrency, privacy and compute questions. Derived search organization must remain separate from revision of witnessed history. **Reading: primary abstract.**

### A deliberately simpler comparator

[MemX, March 17, 2026](https://arxiv.org/abs/2603.16171) combines vector and keyword recall, rank fusion and rejection of weak matches in a local-first system. Its reported temporal and multi-session weaknesses are useful because they resist a universal-memory claim. This supports including a modest native hybrid baseline before adopting a more elaborate memory graph or learned codebook. **Reading: primary abstract.**

## 5. Character and memory evaluation papers

[LongMemEval](https://arxiv.org/abs/2410.10813), initially October 2024, separates extraction, multi-session reasoning, temporal reasoning, updates and abstention. These categories are useful for delayed NPC recall. Its assistant-history question answering is not a test of physical agency, listener permissions or a satisfying ordinary afternoon. **Reading: primary abstract.**

[LoCoMo](https://arxiv.org/abs/2402.17753), February 2024, evaluates long conversational memory through questions, event summaries and multimodal dialogue over persona/event-grounded histories. It is useful inspiration for longitudinal tests, but importing a dataset requires checking its own license; a paper's availability does not confer commercial training rights. **Reading: primary abstract and later papers' asset disclosures.**

[InCharacter](https://arxiv.org/abs/2310.17976), initially October 2023 and revised June 2024, evaluates personality fidelity using interviews rather than only character trivia. It motivates testing distinct tendencies across varied questions. A convincing interview still does not establish that a resident independently acts that way when food, work and another person's wishes compete. **Reading: primary abstract.**

[CharacterEval](https://arxiv.org/abs/2401.01275), January 2024, provides a multi-turn Chinese roleplay benchmark with multiple evaluation dimensions and human quality control. Its main lesson for our comparison is that style, role knowledge and conversational quality should not be collapsed into one score. Language/cultural coverage and known fictional characters differ from OpenLegend's original worlds. **Reading: primary abstract.**

[ES-MemEval](https://arxiv.org/abs/2602.01885), February 2026, extends memory evaluation to changing, implicit personal context and conflict detection. It is an adjacent benchmark, not evidence that OpenLegend is a therapeutic system. Evolving personal interpretation is a useful test dimension; clinical benefit is not an implied product claim. **Reading: primary abstract.**

These should inform the existing CE05/CR12/R24 program. Do not create a new leaderboard that rewards eloquence while ignoring actual consequences, refusal, quiet activity, stale evidence or whole-session cost.

## 6. Context construction: completeness before cosmetic brevity

The strongest research-derived proposal is **purpose-scoped selection with preserved mandatory evidence**, not an arbitrary shorter prompt. For each decision, distinguish current own state and work, triggering observation, relevant obligations, accepted identity, permitted relationship/knowledge context, useful recalled evidence and the actual offered choices.

Selection needs a coverage story. “No matching record returned” may mean there is no record, the record was not indexed, the search was incomplete, or the ranking missed it. Those are different inputs to judgment. A small model cannot repair an omitted constraint it never received.

Keep state facts distinct from assertions. For example, native transfer of two berries, heard claim of a gift and private suspicion of theft must remain distinguishable after rendering and consolidation. Use compact IDs/structured bindings outside ordinary prose where possible, but never discard role, time, count or uncertainty merely to save tokens.

Use the project's existing synthetic benchmark as a controlled starting point, not proof of real data sufficiency. Add actual permitted contexts, real omissions and later outcomes. A context variant that changes the character's biography, model and available actions simultaneously cannot establish the causal benefit of compaction.

## 7. Serving techniques worth evaluating

[vLLM automatic prefix caching](https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/) reuses computation for matching prompt prefixes; it is not automatic semantic caching of decisions and does not remove generation cost. Separate physical worker reuse from carrying a private conversational session forward. Fresh authorized requests may reuse exact permitted computation without silently retaining discarded history. **Reading: official documentation.**

Additional candidates are constrained decoding, continuous batching, speculative decoding, quantized weights/caches and separately scheduled speech workers. Their value is conditional on the exact model/runtime/hardware. A draft model can consume memory and worsen small-batch performance; aggressive batching can improve throughput while worsening one player's latency. The [Hugging Face reports](04-models-local-hosted-openrouter.md#firsthand-community-evidence) document concrete compatibility pitfalls.

## 8. Recommended research order

First establish a complete native-continuation and decision trace. Then compare a local bounded decision model using identical evidence and options. Next compare character generators on the same voice-free episodes. Add optional expression only after grounded text and meaningful action are measured. Investigate retrieval enhancements for demonstrated omissions, and pixels for demonstrated semantic coverage gaps. Consider trained motor policies or full-duplex speech only when a concrete product benefit justifies the extra data, control and safety burden.

This order is our recommendation, not a declaration that all simpler methods always win. It makes failures attributable and preserves the option to adopt an advanced method when its measured benefit is real.
