# Kevin in Halo — source-based reconstruction

Research date: **October 20, 2026**. Status: **external source inspection and architectural analysis; not a reproduced benchmark or an adopted OpenLegend design**.

## Finding the actual implementation

The relevant project is [chasmlol/m8][m8], with a Halo: Combat Evolved bridge for OpenCE and a Kevin persona. It is not merely an unidentified collection of models. Its public main reference was verified as commit **`b009e12decd4dc2145accaafc30788e7c8588ff7`**. The inspected source explains the main mechanisms in the supplied video, although a published repository snapshot is not proof of the exact executable/settings used when the recording was made.

The same author also publishes `chasmlol/chasm`, a larger Fallout: New Vegas-oriented agent backend. That is a useful separate comparison, not evidence that Kevin uses every feature in that other repository. See [the NPC-systems comparison](02-mantella-and-npc-systems.md).

**Central answer:** Kevin is a hybrid of a native game controller, a small semantic decision model, a generative dialogue/vision model and a streaming audio pipeline. The expensive language model does not continuously calculate each footstep, crosshair correction or bullet. Conversely, the fast path is not entirely model-free: Kev performs real inference when selecting an action. “No LLM call” in the creator's jump demonstration is best understood as “no generative dialogue-model call was needed before beginning that action.” [Brain][brain], [Halo patch][halo]

## 1. The stack actually named by the repository

| Role | Recorded implementation | What this establishes |
| --- | --- | --- |
| Bounded decisions | Kev-4B Q8, served by a llama.cpp build with `/v1/systemone` | Scores supplied actions, targets and a speak/no-speak question; does not author dialogue. |
| Dialogue and selected visual requests | `HauhauCS/Gemma4-12B-QAT-Uncensored-HauhauCS-Balanced`, Q4_K_M with its matching multimodal projector | One generative model can answer in character and separately interpret a requested image. |
| Voice synthesis | Breeze TTS 2, local service, reference-voice caching patch | Generates expressive audio from text and delivery directions. |
| Speech recognition | Parakeet TDT 0.6B v2, int8, through sherpa-onnx | Converts microphone/game dialogue audio into text; it is not a visual model. |
| Speech activity detection | Silero VAD | Detects microphone speech boundaries before transcription/turn processing. |
| Embodiment | Custom native Halo companion controller | Owns movement, aiming, firing, reload and control-button execution between semantic decisions. |

The README records the creator's setup as an RTX 5090 with 32 GB VRAM and approximately **25 GB used by the three main model servers**. This is a creator report, not our measurement or a minimum-hardware guarantee. Model file size, loaded weights, projector, caches, audio workers and the game all consume different resources. “Runs locally” does not mean inexpensive on every player's laptop. [Setup][m8]

The model catalogue and license implications are examined separately in [models](04-models-local-hosted-openrouter.md) and [voice](05-realtime-voice-and-serving.md). In particular, do not infer commercial permission for Breeze weights from the Apache license of its serving code.

## 2. Three different update rates, not one brain clock

The source separates **state refresh**, **semantic opportunities** and **physical control**.

The game supplies a current descriptive state and an action catalogue over a local socket. A state update can be frequent without triggering a decision. The Rust brain receives explicit input variants: player speech, game events with a `react` flag, saves, loads and completed summaries. Non-reactive events can enter memory without producing a response. Pending adjacent game events are gathered into a batch before reacting, avoiding a strictly one-call-per-bullet backlog. [Brain input/run loop][brain]

The brain's receive loop checks for input with a one-second timeout. That timeout is **not** an instruction to call Kev every second. A separate quiet-period condition can generate an opportunity after 45 seconds without activity, outside combat and speech. Similarly, the game-supplied speech cooldown determines whether autonomous events may start another utterance; it is not a universal decision cadence. The inspected code does not establish a constant half-second Kev polling loop.

Physical execution runs in the native game update. Once an order exists, movement and combat can continue without waiting for another semantic request. Therefore all of the following can be true at once: current state is frequently refreshed, Kevin aims smoothly every game tick, Kev is called several times for a meaningful event, and Gemma is not invoked for every action.

For OpenLegend, preserve this distinction in both measurements and vocabulary. Count native updates, perception changes, admitted decision opportunities, decision-model requests, generative requests and speech chunks separately. Calling all of them “AI ticks” would conceal the actual cost and latency.

## 3. The real action-selection call graph

The executable `respond`/`decide`/`act` path is more informative than the biological analogy or stale introductory comments. It first chooses an action, then may speak about it. [Decision source][brain]

A typical player command follows this path:

1. Append the recognized player utterance to the feed.
2. Ask Kev to select one supplied action, including `nothing`, which means continuing the present behavior.
3. If that action has alternative targets, ask a separate dependent target-selection question.
4. If it is a search action with a supplied result and follow-up options, record that result and optionally make the follow-up selection.
5. If it requests visual interpretation, obtain the frame and call the vision-capable model before sending the resolved action.
6. Send the action command; generate and stream Kevin's spoken response through the separate speech path.

For autonomous game events, an additional Noul question can decide whether to speak, unless a speech cooldown suppresses that question. Player lines are answered by the current implementation. This is not a universal requirement that every OpenLegend NPC must answer a player.

Consequently, “one reaction” is not necessarily one inference call. A target-bearing action plus a speech judgment can require several sequential small calls; an ambiguous visual destination adds a generative vision call. Independent questions can sometimes be batched, but a target question that depends on the action selection cannot be naively batched without changing the decision problem.

Kev receives the latest **20 feed lines**, along with persona, current situation, mission context and the older-memory summary. Dialogue receives a larger history. Twenty lines are neither twenty tokens nor a guarantee that all relevant commitments survived. This optimization is useful evidence for purpose-specific context, but not a safe replacement for OpenLegend's required-evidence contract.

The public Kev card describes a prefill-only decision model with a pointer head, rather than autoregressive text generation. It implements the System One-style interface, but API similarity is not evidence that it contains Jev's weights or was trained on Jev's outputs. Its own card distinguishes training/validated context from larger advertised serving capacity. [Kev model card][kev]

## 4. How Kevin actually “sees”

### A. Ordinary game-state perception

The bridge can describe known nearby entities and current conditions directly: health/shields, held weapon/ammunition, player proximity, enemies, available targets and current orders. The controller has engine-space positions and aim points. Reading these data is entirely different from recognizing an enemy in a screenshot. [Game protocol][m8], [Halo controller][halo]

This is usually the appropriate primary route for a game whose simulation we own. First derive what the particular actor is entitled to observe; then describe or expose those facts. Do not export the whole authoritative world and ask the model to pretend it cannot see hidden information.

### B. On-demand image interpretation

Kevin also has a genuine image route. `Brain::look` requests the **player's rendered view**, not a continuously rendered first-person Kevin camera. The prompt explicitly tells the model whose view it is receiving. This distinction matters when the player and companion stand in different places or when the camera reveals something the companion cannot physically see. [Vision source][brain]

For a descriptive request, Gemma receives the image, current state and the latest 12 feed lines, then produces a short visual description. For a destination request, the pipeline overlays numbered candidate positions on the picture. The model returns a small structured answer containing a description and a selected spot ID, including zero for no suitable spot. Native code maps that ID to an existing world-space candidate.

The Halo patch defines an 8-by-5 candidate grid across the lower view, with a maximum candidate reach in world units. This is a practical visual grounding trick: **the model chooses a marked candidate; it does not independently infer an arbitrary accurate 3D coordinate from pixels**. The grid is a finite approximation and can miss a desired place. A candidate being on the ground also does not by itself prove a traversable route from Kevin. [View definitions][halo]

This resembles the broad idea of [Set-of-Mark prompting](https://arxiv.org/abs/2310.11441), which marks image regions so a model can refer to them. Similarity is our interpretation, not a claim that the author implemented that paper.

### C. What to transfer, and what not to transfer

Transfer the separation between native geometry and semantic reference resolution. “Stand near that rock” can be resolved against actor-permitted candidate objects or places, with a request-bound handle and an explicit ambiguous/no-match result. An image may help with appearance or an otherwise unrepresented pattern. It should not be mandatory for facts the engine already knows and can lawfully project.

Do not give an OpenLegend resident the human's camera by default. A shared view, a pointed-at object and the resident's own line of sight are different acquisition events. A future image route needs a selected viewpoint, capture time, allowed content, identity rules and currentness validation. Camera UI, hidden labels and tooltips can leak information even when the underlying landscape image looks harmless.

## 5. Why he can aim, run and fight so quickly

The native controller is directly visible in the patch. It is not necessary to assume a neural motor policy or a model choosing mouse deltas. Nor is it accurate to say the project simply turns on the original Halo NPC brain: the inspected implementation has its own companion state and calls the game's unit-control interface. [Native control implementation][halo]

The selected target supplies an aim point. The controller calculates a direction from Kevin's eye position, adds authored aiming error, and moves the current aim toward that direction over successive ticks. Firing is gated on target visibility, a reaction delay, aim alignment and an on/off burst schedule. Movement uses native walk direction and path/reach logic; fighting can add lateral strafing. An empty magazine with reserve ammunition can initiate a native reload.

One-off selections become ordinary control flags: jump, melee, reload, grenade, light, exit vehicle and weapon change. Crouching and hold-fire are retained state. These operations continue at game speed while dialogue is being synthesized. A language model is useful for deciding whether to hold position, whom to engage, whether to follow a request, or what to say—not for recalculating every aiming vector.

That architecture explains the apparent immediacy without proving the demo's end-to-end reaction time. The supplied transcript has no trustworthy frame timings, queue traces or unedited latency distribution. Deaths, falling from a bridge and inconsistent behavior remain relevant counterexamples to the claim of a fully competent companion.

**OpenLegend-specific boundary:** its selected CTR design currently grants one offensive choice one actual strike. Kevin's retained fighting behavior is not permission to silently install automatic repeated attacks. A finite actor-chosen combat activity with explicit stopping, retargeting and withdrawal rules would need its own scoped design review under existing agency/combat owners.

## 6. Mission knowledge, memory and apparent awareness

Mission context is partly authored. The brain reads `levels/<level>.txt` from the persona directory. Knowing what the mission is therefore does not demonstrate that Kevin reconstructed the entire plot by watching gameplay. The bridge also supplies current state and game events, and game dialogue can enter the hearing pipeline. These are complementary channels, not one omniscient visual model. [Context assembly][brain], [Protocol][m8]

The memory mechanism is comparatively simple: a chronological feed plus an older-history summary. Its size estimate uses four characters per token. It normally considers folding at roughly 16,000 estimated tokens, targets about 12,000 after folding, and has a larger pressure threshold. A summarization request asks for a paragraph of at most 250 words. That wording does not guarantee preservation of every name, promise, causal distinction or exact quantity.

Save/load restores stored memory for that game save; a generation counter prevents an old asynchronous summary from being accepted into a different restored memory. The implementation retains a finite collection of save-associated memories. These are useful continuity mechanisms, not proof of OpenLegend's more demanding persistent multi-actor, forgetting and disclosure semantics.

There is an important source-level weakness to avoid copying: the action path appends a sentence describing the chosen action after sending its command, without demonstrating an acknowledged completed game result at that point. A model may subsequently speak as though an instruction succeeded. OpenLegend should preserve intention, accepted action, progress and completed outcome as different facts.

## 7. Why the voice feels so alive

The dialogue model streams text; the code separates complete sentence-sized pieces and delivery directions, and the voice worker synthesizes pieces as they become available. A direction such as whispering or yelling can persist until changed. Reference-voice caching removes repeated preparation. Speech interruption uses generation identities to discard obsolete work. This overlaps stages instead of waiting for an entire answer and complete audio file. [Speech generation][brain], [Voice worker][speak]

Expressive delivery can make a short, shallow line feel much more intelligent. Conversely, an excellent decision can feel inert if speech starts late. Evaluate expressive quality, actual grounding, physical competence, memory and time-to-useful-action separately. An accent or persona drift in the video may involve text, voice conditioning or both; the transcript alone cannot isolate its cause.

## 8. Reproducible follow-up, not a promised replication

A proper reproduction would pin the game/mod commit, model weight hashes, quantization/projector, serving build, prompts, hardware, context length and speech settings. Capture clocks at utterance end, transcription completion, each decision start/end, game command receipt, actual first movement/strike, first generated text, first audio and playback. Include cold start and concurrent rendering/audio load.

Run commands with synonyms, negation, cancellation, contradictory prior instructions and ambiguous referents. Compare continuing a chosen action with genuinely changed circumstances. Verify hold-fire under new enemies, interrupted speech, a target disappearing, a blocked destination, death and save/load. Keep every failed attempt, not only a successful jump.

For OpenLegend, those experiments belong to the existing R03/R24, CR12/AG12, CE05 and CTR owners. The [application and experiment dossier](06-openlegend-applications-and-experiments.md) specifies the comparisons. This research ran no models, paid APIs, game build or benchmark.

## Primary source register

- [m8 README and setup][m8]: first-party architecture, exact stack and hardware report.
- [m8 brain source][brain]: inspected input loop, context, decision, vision, summarization and sentence streaming paths.
- [Halo patch][halo]: inspected view-candidate definitions and native action/control sections; not an exhaustive patch audit or successful build.
- [Voice worker][speak]: implementation follow-up entry point; detailed audio-device behavior still requires reproduction.
- [Kev card][kev]: first-party decision-model mechanism and limitations, separate from the game bridge.

[m8]: https://github.com/chasmlol/m8/blob/b009e12decd4dc2145accaafc30788e7c8588ff7/README.md
[brain]: https://github.com/chasmlol/m8/blob/b009e12decd4dc2145accaafc30788e7c8588ff7/m8/src/brain.rs
[halo]: https://github.com/chasmlol/m8/blob/b009e12decd4dc2145accaafc30788e7c8588ff7/games/halo/m8.patch
[speak]: https://github.com/chasmlol/m8/blob/b009e12decd4dc2145accaafc30788e7c8588ff7/m8/src/speak.rs
[kev]: https://huggingface.co/jaredpalmer/kev-4b
