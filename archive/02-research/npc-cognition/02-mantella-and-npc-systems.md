# Mantella, shared-scene dialogue and other NPC systems

Research date: **October 20, 2026**. Status: **source-based comparison and proposed applications; no reproduced gameplay, model-quality ranking or adoption**.

## 1. Identifying the Skyrim demonstration honestly

Mike supplied a transcript for [the Skyrim video](https://www.youtube.com/watch?v=IngsybtbBeg). “Mandela” is very likely a transcription of **Mantella**, whose official project implements conversations with Skyrim NPCs. However, direct retrieval did not establish the video's exact installed mod version, language model, system prompts, supplementary mods or vision configuration. Current Mantella source explains available mechanisms; it does not establish which of them the creator enabled.

The inspected public main reference is **`art-from-the-machine/Mantella@c0c1ae6db01f3c2a14dbab8ec5c3e6419e4f6bac`**. Read the pinned code alongside [official documentation][docs]. The supplied transcript is direct evidence of what was said in the demonstration, not proof that the statement was grounded in native state.

**Main finding:** character biography, current scene facts, conversation history, summaries, a role-specific prompt and familiar voices can produce convincing characterization without a separate fine-tuned neural model for each resident. But convincing dialogue does not establish comprehensive perception, autonomous physical control or independent private minds for every speaker.

## 2. The observable architecture

A game integration supplies character and scene information to an external application. Recognized player text, selected NPCs, current events and optional images become model input. The application generates dialogue and selected action requests, synthesizes voice, and returns outputs to the game integration. Native game systems still perform movement, fighting, inventory changes and other supported actions. A request to attack is not an LLM calculating every sword swing. [Official overview][docs], [prompt source][prompts]

Mantella supports configurable language-model providers, including OpenRouter, and local or hosted speech components. Consequently, “Mantella's model” is not one fixed checkpoint. Quality and latency depend on configuration, context, model, serving path and the game's integration. Its documentation also describes optional NPC-to-NPC radiant conversation, advanced actions and vision. These are configurable capabilities, not evidence of an always-thinking society running the same loop for every unloaded NPC. [Installation/configuration][install]

The useful architectural comparison with Kevin is not which demo looks more impressive. Kevin tightly combines a selected companion with a custom motor controller. Mantella concentrates on broad character coverage, scene dialogue and game actions. OpenLegend needs persistent independent agency and consistent physical consequences, so neither project's breadth or entertainment value should be mistaken for a drop-in semantic contract.

## 3. Exactly what context is assembled

`src/conversation/context.py` exposes the following model-facing material. Whether every field appears depends on the selected prompt and configuration. [Context source][context]

| Input | Construction in the inspected source | Important limit |
| --- | --- | --- |
| Identity and background | Name, gender/race, character biography; multiple biographies can be concatenated | This is supplied authorship, not an independently learned life. |
| Player description | Configured or game-supplied player description and equipment | The character receives only represented fields; this is not a full visual reconstruction. |
| Scene | Location, time/day and weather | Correctness depends on fresh bridge updates and conversion. |
| Participants | Current conversation roster, nearby names and distances, optional vision hints | Nearby or visible names are not equivalent to actor-specific lawful recognition. |
| Dynamic events | Supplied custom game events and changes such as entering combat or attacking the player | Events absent from the bridge cannot be recovered by eloquence. |
| Memory | Stored summaries for participating characters | Summary loss and source attribution remain real concerns. |
| Capabilities | Legacy action instructions or advanced tools | An offered tool still needs valid native execution. |
| Relationship wording | A configurable trust description derived from relationship rank and conversation history | The default prompt inspected does not include every available placeholder; do not assume the trust string was used in the video. |

The default single-character prompt is compactly organized into identity, background, history, current scene and rules. It asks for spoken dialogue rather than narration or thoughts and directs the model to remain in character. This is a substantial part of the apparent consistency. It is not necessary to insert an explicit internal monologue before each spoken line. [Prompt definitions][prompts]

The implementation has a consequential overflow policy: when its configured prompt fraction is exceeded, it tries full biography plus summaries, then biography without summaries, then neither. The inspected fraction is 45% of the model context limit. Thus a running conversation can remain fluent while losing identity or memory context. This is an implementation tradeoff to inspect, not a recommendation for OpenLegend, whose current accepted identity and required evidence cannot silently disappear.

## 4. “They stay in character” has several causes

Our interpretation is that at least five factors can contribute: a coherent supplied biography, the base model's learned knowledge of a famous fictional setting, current scene facts, local conversational continuity and recognizable voice delivery. The code directly establishes biography/history/scene prompting; the model's exact prior lore contribution in this video is not measured.

A skeptical scholar demanding evidence and a guard dismissing strange claims can both be plausible continuations of those roles. This does not prove that either agent internally maintains a sound causal model, checks every visual anomaly or has a stable belief-revision policy. A model may also confidently invent a book's rarity, a secret or a past experience because it fits the scene.

For OpenLegend's original world, model pretraining cannot be relied upon to supply the right lore. Supply authored and legitimately learned knowledge, not a world wiki that includes every secret. Evaluate whether the character remains recognizable when names and famous-franchise cues are removed, circumstances change and a tempting player assertion contradicts permitted evidence.

The most useful transfer is **situated characterization with real stakes**, not a stronger “never break character” sentence alone. Distinguish personal disposition, private belief, actual observation, hearsay and operator instructions. A character can refuse, doubt, lie or change their mind; none of those choices permits the system to fabricate an observation.

## 5. Multiple voices are not necessarily independent agents

The inspected multi-NPC prompt includes the participating biographies and summaries together. It asks one model response to provide NPC lines with speaker-name prefixes and decide who should speak. This can be an efficient and entertaining scene-writing strategy. It is not evidence that each participant separately receives only its own private context and independently chooses its contribution. [Multi-character prompt][prompts], [context assembly][context]

That distinction is especially relevant to the video's apparent group belief changes. Shared prompt material can help a model produce coherent disagreement or a dramatic chorus. It can also make information available across character boundaries inside a single generation. Source inspection establishes that architecture, not a finding that every Mantella conversation leaks a specific secret.

OpenLegend's accepted direction is independent actor interpretation and actual participation. A future batched implementation may share immutable common computation, but it must not merge private motives or authorize one model to invent another person's consent. Compare a shared-scene writer as a diagnostic baseline or an explicitly different product mode, not as an unnoticed optimization of independent minds.

## 6. How memory works, and what it does not prove

`Summaries` stores conversation summaries in text files and loads the latest summaries for a character/world identity. In a multi-character prompt it concatenates memories with character labels. On saving conversation state, it builds per-NPC message threads from recorded join/leave participation. Characters with identical heard histories can share one summarization call. Pending sharing can append an attributed summary to a recipient. [Summary implementation][summaries]

This is more careful than assuming every nearby person heard the entire conversation. It also shows that **sharing computation is possible when the actual input experience is the same**. It is not the same as OpenLegend's graded acoustic evidence, stable identity, exact source versions, current-format restore and forgetting contract.

The inspected code has message-count thresholds for ordinary summaries, with different treatment of reload and radiant conversations. Small interactions can therefore be omitted by policy. Any compression can additionally lose a correction, uncertainty or causal qualification. The presence of a summary file does not establish that a later choice correctly uses it.

The source exposes a further warning: the trust helper uses conversation-log length in some relationship cases, and its own comment notes that radiant conversations can inflate this proxy without direct player interaction. This is not a sophisticated learned trust system. More conversation is not necessarily more trust, particularly after threats, manipulation or unwanted attention.

The transcript does not prove autonomous worldwide rumor diffusion. A character mentioning the current premise could be drawing from its own saved history, a shared prompt, explicit sharing, player repetition or general continuation. To demonstrate diffusion, inspect each actual transmission, permitted recipient, stored provenance and later independent use. Repeated copies of the same claim must not become independent corroboration.

## 7. How the characters perceive the world

### Native descriptions

The context source receives named nearby actors, distances, equipment, combat flags, locations and custom events. Some “vision hints” are lists assembled from game data, not visual inference. The fallback nearby-roster change detector compares sets of names; this illustrates why names alone are a weak identity key when multiple guards or spawned copies share a name. [Context source][context]

The video repeatedly contrasts successful inventory-related responses with failures to notice spawned objects, flight or position changes. A plausible explanation is uneven bridge coverage or stale input: an inventory transfer may be represented clearly while an arbitrary console transformation is not. Another possibility is model error despite adequate evidence. Without the exact request trace, neither explanation is proved.

### Optional image descriptions

Official configuration documents an optional vision route using screenshots of the player's view, either through a vision-capable main model or a separate vision service. It should not be assumed enabled in the supplied recording. Even with images enabled, the source camera and capture cadence matter; a player's screenshot is not the NPC's own eye view. [Vision configuration][install]

A model saying “I see no chickens” is therefore not evidence of deep resistance to existential arguments. It may lack a chicken observation, have an outdated scene, misunderstand the image, or simply hallucinate a confident denial. Treat unobserved, not represented, stale and genuinely absent as different states.

### The dialogue/physics disagreement

The transcript contains an especially valuable failure: the character denies attacking while native combat continues. That is a failure of alignment between action state and speech, not a desirable way to preserve characterization. A coherent reply requires current own-action state and recent actual outcomes. A polite “let us stop” cannot stop a combat package unless the action is actually admitted and executed.

For OpenLegend, include own ongoing action, requested-but-unaccepted changes, completed outcomes and relevant transition failures in the required evidence path. Make refusal, incapacity, service failure and native rejection distinguishable. Do not paper over contradictions with more dramatic prose.

## 8. Voice and latency lessons

Mantella's real-time guidance emphasizes the whole pipeline: model first-token latency and throughput, prompt size, local versus remote execution, transcription endpointing, lip-sync preparation and sentence delivery. It describes fast-response and lazy lip-sync options, and proactive transcription that overlaps processing with speech detection. These are documented engineering tactics, not independently reproduced latency measurements. [Real-time guide][realtime]

Streaming audio alone is insufficient when the application buffers an entire text response first. Conversely, extremely short independently synthesized chunks may worsen prosody or speaker consistency. Measure useful first audio and sustained playback, not only an endpoint's first byte. The [voice dossier](05-realtime-voice-and-serving.md) compares these tradeoffs and preserves OpenLegend's existing text-first and audience boundaries.

Mantella's own fine-tuned-model page explicitly describes its older Skyrim Llama 3 8B fine-tune as outdated and no longer recommended against newer general models. That is useful contrary evidence to the assumption that a roleplay-labelled checkpoint must be superior. Its historical synthetic interaction dataset is a possible training-method reference, not proof of current quality. [Fine-tuning documentation][finetunes]

## 9. Chasm/FNV: useful adjacent implementation, not Kevin's complete brain

The author's separate [Chasm repository][chasm] packages character cards, lore/action discovery, local speech, witnessed events, schedules and save-aware memory. Selected source inspection supports several concrete lessons:

| Mechanism | Source-level observation | OpenLegend interpretation |
| --- | --- | --- |
| Speaker selection | `orchestrator.rs` uses native scores for crosshair, name, recency, distance and topic plus jitter, replacing another model call | Cheap turn allocation is a legitimate comparison, but forced top-speaker/group responses are not independent willingness. |
| Event bundling | `witness.rs` batches witnessed events and separates memory-only intake from reaction triggers | Remembering every eligible event need not generate speech or a model call for each event. |
| Witness eligibility | Range-based captured witnesses can have optional sight gates | Useful bridge mechanism, not proof of exact line of sight, hearing or identity for OpenLegend. |
| Learned habits | Journaled intentions can become event-triggered opportunities for a fresh action turn | External-memory adaptation is not weight training or a verified model-free reflex. |
| Long actions | Schedules and movement continue outside a dialogue turn | Preserve intent through native work rather than keeping an LLM session alive. |
| Completion shortcuts | Some scheduler steps use fixed settling delays; failed or missing journeys may allow progress | Do not confuse elapsed time or command submission with actual completion. |
| Save semantics | Some operational report/completion ledgers deliberately carry forward while tasks rewind | “Everything rolls back” needs field-by-field evidence; do not copy broad README claims as lifecycle guarantees. |

These observations come from the inspected `README.md`, bridge guide, `orchestrator.rs`, `witness.rs` and `scheduler.rs` at source snapshot `d740b9742869e436576d93180f7b5886afdfa9db`. No build, comprehensive security audit or gameplay benchmark was performed. The actor-witness and task semantics are interesting references, not an adopted replacement for existing OpenLegend owners.

## 10. Practical conclusions

**Adopt as research hypotheses:** coherent character/scene/history composition; current own-action evidence; asynchronous native execution; reuse of genuinely identical common work; input/prompt inspection; independent measurement of expression and grounding.

**Do not copy without a new decision:** shared private multi-character prompts, obligatory replies, trust by conversation count, dropping required identity on overflow, player-camera omniscience, fixed-time task completion, or broad offscreen-memory assumptions.

The strongest next investigation is not another amusing conversation. It is a controlled set of disagreements between player assertions and actual permitted evidence: claimed gift without transfer, transferred item with exact count, hidden transformation, witnessed attack, a withdrawn instruction, an identical-looking stranger, and an NPC returning after an unheard exchange. Record the actual prompt and native outcomes. The [experiment dossier](06-openlegend-applications-and-experiments.md) extends existing CE/CR/SPK owners rather than creating a separate acceptance program.

## Primary sources and access limits

The code paths below were directly read where discussed. Official documentation is moving documentation checked on the research date. The video's exact deployment remains unresolved.

[docs]: https://art-from-the-machine.github.io/Mantella/
[install]: https://art-from-the-machine.github.io/Mantella/pages/installation.html
[realtime]: https://art-from-the-machine.github.io/Mantella/pages/real_time_npcs.html
[finetunes]: https://art-from-the-machine.github.io/Mantella/pages/fine_tuned_models.html
[context]: https://github.com/art-from-the-machine/Mantella/blob/c0c1ae6db01f3c2a14dbab8ec5c3e6419e4f6bac/src/conversation/context.py
[prompts]: https://github.com/art-from-the-machine/Mantella/blob/c0c1ae6db01f3c2a14dbab8ec5c3e6419e4f6bac/src/config/definitions/prompt_definitions.py
[summaries]: https://github.com/art-from-the-machine/Mantella/blob/c0c1ae6db01f3c2a14dbab8ec5c3e6419e4f6bac/src/remember/summaries.py
[chasm]: https://github.com/chasmlol/chasm/tree/d740b9742869e436576d93180f7b5886afdfa9db
