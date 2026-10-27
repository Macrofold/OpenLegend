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

The [initial model dossier](04-models-local-hosted-openrouter.md) links exact Kev, Qwen3.5, Gemma, HauhauCS, Hermes and Nemotron artifacts and the retrieved OpenRouter pages. The [voice dossier](05-realtime-voice-and-serving.md) links Breeze, Qwen3-TTS, Pocket TTS, Kokoro, Parakeet, Moshi and the optimized Nari serving implementation. Those documents own their dated prices, model roles and qualifications; this register does not create a second independently maintained catalogue.

The [community survey](08-community-adoption-and-model-shortlist.md) adds application-specific hosted traffic, exact local-artifact distribution signals, CHIM guidance and firsthand creative-model reports. The [low-refusal dossier](09-low-refusal-character-simulation.md) adds Hermes 4.3, Cydonia, Venice, Dolphin and an API-only watchlist, with exact endpoint and rights qualifications. The [architecture synthesis](10-architecture-composition-and-serving.md) adds FunctionGemma/LFM2.5 and PersonaPlex/Qwen3-Omni/MiniCPM-o primary cards and official serving documentation. The [combined panel](11-evaluation-and-research-gates.md) is the integrated proposed comparison roster; earlier smaller sets remain scoped examples.

Official Mantella pages consulted cover [overview](https://art-from-the-machine.github.io/Mantella/), [installation/configuration](https://art-from-the-machine.github.io/Mantella/pages/installation.html), [real-time NPCs](https://art-from-the-machine.github.io/Mantella/pages/real_time_npcs.html), [fine-tuned models](https://art-from-the-machine.github.io/Mantella/pages/fine_tuned_models.html) and [modded NPCs](https://art-from-the-machine.github.io/Mantella/pages/adding_modded_npcs.html). Moving documentation can differ from a pinned release or the creator's installation.

**Availability results:** Kev-4B, Gemma 4 26B A4B and Gemma 4 31B had retrieved OpenRouter listings with provider/pricing information. The exact Kevin HauhauCS artifact and stock Gemma 4 12B route were not established on OpenRouter. A Hermes 4 70B catalogue page did not expose an active provider table in the retrieved content. The later Hermes 4.3 36B page/endpoint attempts also did not establish a route; these are distinct models. Failed guessed slugs are not proof of global absence. Speech routes were not inferred from text-model listings.

**Exact hosted capability evidence:** public [Cydonia](https://openrouter.ai/api/v1/models/thedrummer/cydonia-24b-v4.1/endpoints) and [Venice](https://openrouter.ai/api/v1/models/venice/uncensored/endpoints) endpoint metadata was read. Their supported-parameter lists differ, and generic tool-choice flags do not fully resolve actual tool support. JSON mode, strict schema enforcement and function calling remain separate questions requiring a real adapter check. The dossier records requested route versus returned model identity and dated prices. No authenticated model call was made.

**Licensing results:** Breeze's code and model/output rights are materially different. HauhauCS metadata and the official Gemma artifact require artifact-specific review rather than assumed inherited permission. The smaller Dolphin, FunctionGemma, LFM and PersonaPlex candidates have their own stated terms. The Heabsy watchlist is explicitly not published weights. Model cards, runtime code, datasets, voices and hosted terms can each impose separate obligations. This is an identified adoption gate, not comprehensive legal advice or a certification of commercial rights.

**Popularity limits:** OpenRouter application statistics and Hugging Face download counts are dynamic snapshots, not unique-user counts or a census of NPC deployments. Later retrievals on the same research date already changed token totals. The survey preserves its original dated values; no exact count is a current routing guarantee or a quality measurement. The follow-up did not establish representative private-community consensus or exact OpenRouter routes for every local fine-tune.

## 4. Paper coverage and reading depth

| Reading depth | Sources | Scope of conclusions drawn |
| --- | --- | --- |
| Selected primary HTML methodology and limitations | [STRATA](https://arxiv.org/html/2609.38881v1), [LycheeMemory V2](https://arxiv.org/html/2608.12990v2), [MemCode](https://arxiv.org/html/2610.19472v1) | Described decomposition/retrieval mechanisms and explicit evaluation limits. No reproduction or full mathematical/source-code audit. |
| Primary abstracts/version metadata | [Generative Agents](https://arxiv.org/abs/2304.03442), [Voyager](https://arxiv.org/abs/2305.16291), [Cradle](https://arxiv.org/abs/2403.03186), [SayCan](https://arxiv.org/abs/2204.01691), [ReAct](https://arxiv.org/abs/2210.03629), [Set-of-Mark](https://arxiv.org/abs/2310.11441) | Broad architecture and comparison hypotheses, not detailed replication procedures or unverified numerical superiority. |
| Primary abstracts/version metadata | [TiMem](https://arxiv.org/abs/2601.02845), [REALM](https://arxiv.org/abs/2609.16053), [MemX](https://arxiv.org/abs/2603.16171) | Candidate temporal, adaptive and modest hybrid-memory approaches. |
| Primary abstracts/version metadata | [LongMemEval](https://arxiv.org/abs/2410.10813), [LoCoMo](https://arxiv.org/abs/2402.17753), [InCharacter](https://arxiv.org/abs/2310.17976), [CharacterEval](https://arxiv.org/abs/2401.01275), [ES-MemEval](https://arxiv.org/abs/2602.01885) | Useful evaluation dimensions and differences from embodied independent game characters. |
| First-party technical/product documentation | [SIMA 2](https://deepmind.google/blog/sima-2-an-agent-that-plays-reasons-and-learns-with-you-in-virtual-3d-worlds/), [NVIDIA ACE](https://developer.nvidia.com/ace-for-games), [in-game inference](https://developer.nvidia.com/blog/bring-nvidia-ace-ai-characters-to-games-with-the-new-in-game-inference-sdk), [SetFit](https://huggingface.co/docs/setfit/index), [vLLM prefix caching](https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/) | Documented mechanisms and deployment considerations, not observed OpenLegend performance. |
| Primary HTML methods, evaluation scope and limitations | [Refusal direction](https://arxiv.org/html/2406.11717v3), [RoleBreak](https://arxiv.org/html/2609.16614v1), [CHARM](https://arxiv.org/html/2609.01352v1), [anonymous role-playing evaluation](https://arxiv.org/html/2603.03915v1) | Evidence for separating refusal from broader capability, sustained voice/persona quality, actual knowledge restraint and original-character generalization. No independent replication or claim of current-model superiority. |
| Primary abstracts/version metadata | [XSTest](https://arxiv.org/abs/2308.01263), [The Safety Relay](https://arxiv.org/abs/2608.30585), [Too Nice to Tell the Truth](https://arxiv.org/abs/2604.10733) | Over-refusal, recognition-versus-compliance and player-pleasing research questions. Their benchmarks and policies are not adopted as game rules. |

The [architecture dossier](03-architectures-and-papers.md), [low-refusal study](09-low-refusal-character-simulation.md) and [evaluation brief](11-evaluation-and-research-gates.md) carry interpretation and source-specific caveats. Several current papers are preprints; publication recency is not evidence of independent validation or fitness for production. No universal “best NPC architecture” ranking is claimed.

## 5. Firsthand implementation reports

Hugging Face discussions were deliberately included to test polished model claims against practical experience. The [model dossier's report section](04-models-local-hosted-openrouter.md#6-firsthand-community-evidence) identifies particular threads, dates, speakers and ambiguity: speculative-decoding runtime compatibility, a request for upstream fine-tune refresh, slow Qwen speech serving, an optimized H100 implementation and differences between cloned-voice and instruction-controlled modes. The [community survey](08-community-adoption-and-model-shortlist.md#5-what-users-report-strengths-and-problems-together) retains contrasting Artemis reports; the newer low-refusal dossier retains the author's Cydonia version caveat.

These are firsthand reports, not a representative survey or controlled consensus. An inconsistent model name in one environment report was retained as a caveat, not converted into a performance benchmark. Later comments do not prove the original issue was fixed in every release. Generic aggregators and promotional summaries were not used as technical authority when primary sources were available.

## 6. Specific further research

| Unresolved question | Next evidence that could settle it | Existing route |
| --- | --- | --- |
| Did the published m8 snapshot exactly match the Halo recording? | Creator's build/weight/config manifest or a versioned release tied to the video | Kevin reproduction; do not block the source-supported architectural conclusions. |
| Which Mantella model, prompts and vision settings made the Skyrim episode? | Creator configuration, exact request logs and game-side event export | E3/E4; keep deployment attribution unresolved until obtained. |
| Is poor perception a bridge omission or model failure? | Compare native observer evidence, exported context and actual model response at the same moment | E4, SPK/CR/EPR. |
| Does a local decision model improve this game's choices? | Same-input held-out comparison, actual supported endpoint, full latency/cost and error coverage; separate interpretation from independent willingness | E2, R03/CR12. |
| Which low-refusal or creative model improves legitimate characterization? | Matched stock/modification and popular-hosted text-only episodes, native consequences, service-boundary checks and blinded review of sanitization | E3, CE05/R24 and PD07; use the combined panel rather than Kev alone. |
| Do exact hosted routes support our required output contracts? | Small actual schema/tool/stream/cancellation probes with returned provenance and full accounting | Current provider/MW/CR owners; no silent fallback or retry. |
| Can expressive or direct speech fit deployment, rights and hearing semantics? | Exact model/voice terms, publication design and concurrent hardware/streaming measurements | E6, HE07/NST/release owners. |
| Do recent memory methods beat a modest native improvement? | Consequential omissions, matched histories, full ingestion/read costs and lifecycle fault cases | E5, R11/R19. |
| Can computation be shared without sharing private knowledge? | Divergent-observer comparison through real request preparation and currentness boundaries | E7, IS/PF/SPK. |
| Would a learned routine or finite combat activity improve play? | Demonstrated existing-path gap, explicit authority/stopping design, then independent whole episodes | E8 and the focused needs-design map; no automatic execution adopted here. |
| Will a promising short demo remain coherent with original people? | Longer held-out episodes, unfamiliar identities, actual knowledge-boundary checks, repeated trials and human assessment | E3/E4/E6, CE05/CR12/AG12; retain exposure length and severe failures. |
| Is weight training worth more than a context/template repair? | Specific repeated failure, lawful representative data, contamination controls and matched untuned baseline | Conditional existing AI/character/privacy owners; no training project selected. |

## 7. OpenLegend evidence and task completion boundary

Current owner documents were read at baseline `a612eecf43d225b5f9087287573ec3e054641cf9`, including the character specification, cognition/character/intelligent-simulation/combat/hearing/streaming trackers, service safety contract, existing Jev/Hindsight research and research/design registers. Their historical results remain scoped to their recorded revisions and are not new measurements from this task. The follow-up reread the relevant research and needs-design owner, service policy and existing benchmark fairness guidance while preserving all earlier dossiers from `4acdabdd98279c24bd27a4933a5a09facbd866b8`.

This packet records external research, current-source analysis, proposed applications and unrun experiments. It does not install models, implement a bridge, certify the existing runtime, change default providers, relax content policy, run player studies or spend on inference. Public documentation access and source inspection are the evidence produced here. Full paired designs remain separate, as Mike requested.
