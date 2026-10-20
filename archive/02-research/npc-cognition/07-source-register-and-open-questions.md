# Source register, reading depth and unresolved evidence

Research date: **October 20, 2026**. This record distinguishes direct source inspection, creator/vendor statements, primary research, firsthand reports and our proposed application. It is not a certification of any dependency, a comprehensive security audit or a benchmark replication.

## 1. Evidence categories

**Source-inspected** means the named code or configuration was actually read. It establishes implementation intent and control flow at that snapshot, not successful execution. **Documented** means an official model card, product page or project guide describes a capability. **Reported result** means an author/vendor/user supplies a measurement; it was not independently reproduced here. **Inference** means our explanation or application, labeled accordingly. **Unresolved** means available evidence did not settle the question.

A model catalogue entry is not a successful account-level request. A repository's README is not proof that every path has the advertised lifecycle. A supplied transcript is not a frame-timed video benchmark. Different inference runtimes or paper reader models can make superficially comparable numbers incomparable.

## 2. Video and implementation provenance

| Source | Access and scope | What remains unverified |
| --- | --- | --- |
| [Halo Kevin video](https://www.youtube.com/watch?v=EOfm3h4xYU8) | Extensive transcript supplied by Mike; interpreted alongside the matching public project | Exact recording date/build/settings, editing and measured end-to-end latency. No independent frame-by-frame viewing is claimed. |
| [Skyrim video](https://www.youtube.com/watch?v=IngsybtbBeg) | Extensive transcript supplied by Mike; Mantella is the likely intended mod name | Exact installed mod/version/provider/model, prompt, supplementary mods and enabled vision. |
| [m8](https://github.com/chasmlol/m8/tree/b009e12decd4dc2145accaafc30788e7c8588ff7) | Commit reference verified; README, relevant `brain.rs` context/input/decision/vision/memory/streaming paths and selected Halo patch sections inspected | Not built or played; no complete safety, navigation or every-path audit. |
| [Mantella](https://github.com/art-from-the-machine/Mantella/tree/c0c1ae6db01f3c2a14dbab8ec5c3e6419e4f6bac) | Commit reference verified; relevant context assembly, prompt definitions and summary participation/sharing code inspected | No game-side plugin reproduction or proof that this snapshot matches the video. |
| [Chasm/FNV backend](https://github.com/chasmlol/chasm/tree/d740b9742869e436576d93180f7b5886afdfa9db) | Separate source snapshot; README, bridge guide, speaker orchestrator, witness intake and scheduler inspected | Not the same as m8; no proof that all advertised learned habits, actions and save paths work reliably. |

The detailed dossiers identify exact source paths. Links to supporting implementation entry points do not imply every file in the repository was audited. No proprietary game assets, model weights or cloned voices were copied into OpenLegend.

## 3. Primary documentation and model cards

The [model dossier](04-models-local-hosted-openrouter.md) links exact Kev, Qwen3.5, Gemma, HauhauCS, Hermes and Nemotron artifacts and the retrieved OpenRouter pages. The [voice dossier](05-realtime-voice-and-serving.md) links Breeze, Qwen3-TTS, Pocket TTS, Kokoro, Parakeet, Moshi and the optimized Nari serving implementation. Those documents own the dated prices, model roles and qualifications; this register does not create a second independently maintained catalogue.

Official Mantella pages consulted cover [overview](https://art-from-the-machine.github.io/Mantella/), [installation/configuration](https://art-from-the-machine.github.io/Mantella/pages/installation.html), [real-time NPCs](https://art-from-the-machine.github.io/Mantella/pages/real_time_npcs.html), [fine-tuned models](https://art-from-the-machine.github.io/Mantella/pages/fine_tuned_models.html) and [modded NPCs](https://art-from-the-machine.github.io/Mantella/pages/adding_modded_npcs.html). Moving documentation can differ from a pinned release or the creator's installation.

**Availability results:** Kev-4B, Gemma 4 26B A4B and Gemma 4 31B had retrieved OpenRouter listings with provider/pricing information. The exact Kevin HauhauCS artifact and stock Gemma 4 12B route were not established on OpenRouter. A Hermes 4 70B catalogue page did not expose an active provider table in the retrieved content. Failed guessed slugs are not proof of global absence. Speech routes were not inferred from text-model listings.

**Licensing results:** Breeze's code and model/output rights are materially different. HauhauCS metadata and the official Gemma artifact also require artifact-specific review rather than assumed inherited permission. Model cards, runtime code, datasets, voices and hosted terms can each impose separate obligations. This is an identified adoption gate, not comprehensive legal advice or a certification of commercial rights.

## 4. Paper coverage and reading depth

| Reading depth | Sources | Scope of conclusions drawn |
| --- | --- | --- |
| Selected primary HTML methodology and limitations | [STRATA](https://arxiv.org/html/2609.38881v1), [LycheeMemory V2](https://arxiv.org/html/2608.12990v2), [MemCode](https://arxiv.org/html/2610.19472v1) | Described decomposition/retrieval mechanisms and explicit evaluation limits. No reproduction or full mathematical/source-code audit. |
| Primary abstracts/version metadata | [Generative Agents](https://arxiv.org/abs/2304.03442), [Voyager](https://arxiv.org/abs/2305.16291), [Cradle](https://arxiv.org/abs/2403.03186), [SayCan](https://arxiv.org/abs/2204.01691), [ReAct](https://arxiv.org/abs/2210.03629), [Set-of-Mark](https://arxiv.org/abs/2310.11441) | Broad architecture and comparison hypotheses, not detailed replication procedures or unverified numerical superiority. |
| Primary abstracts/version metadata | [TiMem](https://arxiv.org/abs/2601.02845), [REALM](https://arxiv.org/abs/2609.16053), [MemX](https://arxiv.org/abs/2603.16171) | Candidate temporal, adaptive and modest hybrid-memory approaches. |
| Primary abstracts/version metadata | [LongMemEval](https://arxiv.org/abs/2410.10813), [LoCoMo](https://arxiv.org/abs/2402.17753), [InCharacter](https://arxiv.org/abs/2310.17976), [CharacterEval](https://arxiv.org/abs/2401.01275), [ES-MemEval](https://arxiv.org/abs/2602.01885) | Useful evaluation dimensions and differences from embodied independent game characters. |
| First-party technical/product documentation | [SIMA 2](https://deepmind.google/blog/sima-2-an-agent-that-plays-reasons-and-learns-with-you-in-virtual-3d-worlds/), [NVIDIA ACE](https://developer.nvidia.com/ace-for-games), [in-game inference](https://developer.nvidia.com/blog/bring-nvidia-ace-ai-characters-to-games-with-the-new-in-game-inference-sdk), [SetFit](https://huggingface.co/docs/setfit/index), [vLLM prefix caching](https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/) | Documented mechanisms and deployment considerations, not observed OpenLegend performance. |

The [architecture dossier](03-architectures-and-papers.md) carries the interpretation and source-specific caveats. Several current papers are preprints; publication recency is not evidence of independent validation or fitness for production. No universal “best NPC architecture” ranking is claimed.

## 5. Firsthand implementation reports

Hugging Face discussions were deliberately included to test polished model claims against practical experience. The [model dossier's report section](04-models-local-hosted-openrouter.md#6-firsthand-community-evidence) identifies the particular threads, dates, speakers and ambiguity: speculative-decoding runtime compatibility, a request for upstream fine-tune refresh, slow Qwen speech serving, an optimized H100 implementation and differences between cloned-voice and instruction-controlled modes.

These are firsthand reports, not a representative survey or controlled consensus. An inconsistent model name in one environment report was retained as a caveat, not converted into a performance benchmark. Later comments do not prove the original issue was fixed in every release. Generic aggregators and promotional summaries were not used as technical authority when primary sources were available.

## 6. Specific further research

| Unresolved question | Next evidence that could settle it | Existing route |
| --- | --- | --- |
| Did the published m8 snapshot exactly match the Halo recording? | Creator's build/weight/config manifest or a versioned release tied to the video | Kevin reproduction; do not block the source-supported architectural conclusions. |
| Which Mantella model, prompts and vision settings made the Skyrim episode? | Creator configuration, exact request logs and game-side event export | E3/E4; keep deployment attribution unresolved until obtained. |
| Is poor perception a bridge omission or model failure? | Compare native observer evidence, exported context and actual model response at the same moment | E4, SPK/CR/EPR. |
| Does local Kev improve this game's decisions? | Same-input held-out comparison, actual supported endpoint, full latency/cost and error coverage | E2, R03/CR12. |
| Does the modified Gemma improve legitimate characterization? | Matched stock/modification text-only episodes plus native consequences and service-boundary tests | E3, CE05/R24. |
| Can expressive speech fit actual deployment and rights? | Exact license/voice provenance review and concurrent hardware/streaming measurements | E6, HE07/release owners. |
| Do recent memory methods beat a modest native improvement? | Consequential omissions, matched histories, full ingestion/read costs and lifecycle fault cases | E5, R11/R19. |
| Can computation be shared without sharing private knowledge? | Divergent-observer comparison through real request preparation and currentness boundaries | E7, IS/PF/SPK. |
| Would a learned routine or finite combat activity improve play? | Demonstrated existing-path gap, explicit activity authority/stopping design, then independent full episodes | E8 and the focused needs-design map; no automatic execution adopted here. |

## 7. OpenLegend evidence and task completion boundary

Current owner documents were read at baseline `a612eecf43d225b5f9087287573ec3e054641cf9`, including the character specification, cognition/character/intelligent-simulation/combat/hearing/streaming trackers, the service safety contract, existing Jev/Hindsight research and research/design registers. Their historical results remain scoped to their recorded revisions and are not new measurements from this task.

This packet records external research, current-source analysis, proposed applications and unrun experiments. It does not install models, implement a bridge, certify the existing runtime, change default providers, relax content policy, run player studies or spend on inference. Public documentation access and source inspection are the evidence produced here. Full paired designs will be commissioned separately, as Mike requested.
