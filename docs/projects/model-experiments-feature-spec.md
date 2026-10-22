# Hugging Face model experiments — feature specification

| Status      | Current progress                                                                                             | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------ | ------------ |
| In progress | The deployment and experiment design is specified; implementation, model execution and adoption remain open. | 2026-10-22   |

## 1. Purpose and selected outcome

An operator can choose a Hugging Face model, have Macrofold prepare an accountable deployment, and compare that exact model with OpenLegend's current generator using the same character, permitted evidence, response contract and game rules. The first purpose is to test whether low-refusal or creative models portray permitted fictional conflict, disagreement and individuality better without losing reliable actions, privacy, continuity or responsiveness.

“Any Hugging Face model” means any repository can be submitted for compatibility assessment. It does not promise that every artifact is generative, downloadable, legally usable, compatible with a selected runtime, or small enough for the available hardware. Unsupported architectures, task types, missing weights and required unreviewed code receive a specific capability result. The operator can choose another supported artifact or request a reviewed runtime recipe; the platform must not silently substitute a different model.

The canonical [Macrofold deployment contract](https://github.com/Macrofold/Macrofold/blob/design/huggingface-model-deployments-2026-10-22/docs/projects/hugging-face-model-deployments-contract.md) owns the shared wire format; this repository consumes it. Macrofold owns source resolution, artifact/runtime pinning, deployment permissions, readiness, capability verification and allocation accounting; it also owns provisioning/shutdown for managed hosting. Imported-host lifecycle remains with its external owner. OpenLegend owns the experiment, role selection, character context, response validation, gameplay authority, publication and comparison. The game receives a deployment reference and restricted use access; it receives no Hugging Face, hosting or deployment-management credentials.

## 2. Current baseline and boundaries

The inspected baseline is `Macrofold/OpenLegend` `main` at `27c6fb8152ec58c34334e74ba91a9d5bec6a30ff`. Ordinary Macrofold generation already uses `/v1/inferences`, durable Run identity, strict structured output and completed-result accounting. Two callers currently hardcode OpenRouter. Native decision questions, full agent execution, embeddings, stronger-model reconsideration and their financial owners are separate routes. [AI providers](../ai-providers.md) owns current behavior; none of the new deployment/profile controls is installed by this document.

The October 20 [NPC cognition research](../../archive/02-research/npc-cognition/README.md) is evidence and experiment motivation. This feature selects the missing deployment/experiment contracts; it does not adopt a model from its roster or declare an unrun comparison successful. Its [low-refusal taxonomy](../../archive/02-research/npc-cognition/09-low-refusal-character-simulation.md#1-what-freedom-means-for-this-game) remains the diagnostic vocabulary.

The engine/world boundary does not change. Model output proposes existing operations; native authority determines whether an action can start and what actually occurs. A model cannot grant itself an object, private memory, physical effect, standing attack permission, deployment privilege or additional spending. World content remains world-owned. No named NPC or model gets a special gameplay branch.

## 3. Operator and developer journeys

### J1 — Prepare an exact experimental deployment

The operator gives Macrofold a Hugging Face repository or model URL. Macrofold resolves the revision and artifacts, identifies a supported recipe, checks access/terms prerequisites and presents the selected hardware, effective limits, quoted rate and finite funded lifetime. A metadata check is not a paid launch. Starting the prepared deployment requires the existing authenticated operator's spending authority for that exact configuration.

Before obtaining the quote/activation, the owner grants read/use to the exact game principal or API key and trusted Macrofold workspace. Even owner inference needs an explicit use grant. Adding a recipient after activation applies to a new activation; revocation immediately blocks future use. The game cannot create its own grant.

When deployment and capability qualification finish, the operator receives an immutable deployment binding, source/runtime provenance, actual capability and limit description, and the associated allocation authorization. They place only the restricted Macrofold reference and experiment configuration in trusted server-side settings. OpenLegend does not create, wake, resize, renew, stop or delete the model host in response to game activity.

An inaccessible gated model, incompatible tokenizer/template, unsupported schema, insufficient memory, unavailable GPU or failed startup produces an explicit result. Changing quantization, context, runtime, artifact or GPU after preparation requires another reviewed revision; a successful configuration for one model does not qualify another.

### J2 — Compare outputs without changing a world

The developer selects the exact baseline and experimental model, freezes original-character scenarios and references, and prepares one experiment manifest. A dry preparation performs no inference or deployment management. It identifies incompatible capabilities, context/output limits, missing permission and missing cost authorization before a comparison can begin.

An explicitly live run submits each selected task once, records every attempted and unattempted task, and retains provider completion, schema validity, refusal classification, latency and all known/uncertain financial obligations. It never fixes an answer by stripping instructions or quietly trying a different model. Existing benchmark journals, locks, source fingerprints and grading separation are reused.

An explicit offline raw-text mode can inspect models that lack qualified strict JSON schema. It produces private text only, never action proposals or gameplay publication; it cannot establish structured-response or native-action success. Strict-schema and raw-text cohorts remain distinct.

Offline evaluation establishes model behavior on the supplied inputs. It does not establish native execution, autonomous character behavior, real-player enjoyment or production reliability.

### J3 — Try the candidate through ordinary NPC decisions

After transport qualification, a developer selects a trusted experiment profile for a disposable world and names the supported NPC response purposes to override. Each new applicable request resolves one exact deployment revision before funding admission; the ordinary character context and game response schema remain unchanged. In-game use initially requires a verified manifest and qualified exact schema. Imported endpoints with operator-declared identity remain labeled offline diagnostics until their identity can be verified. The completed answer travels through the same reference resolution, current-state validation and native admission as the baseline.

The initial profile can select fast and complex NPC response generation independently. These are explicit caller purposes, not every request labeled `fast` or a string match on a model name. Player expression, native action interpretation and memory consolidation also use fast execution today and must retain their own selected models. Native judgment, embeddings, reflection, World Agent, full harness and direct stronger-model reconsideration do not inherit the experimental generator accidentally.

Single-model studies explicitly turn reconsideration off for their experiment process. Ordinary game defaults remain unchanged. A study that deliberately compares the entire baseline system may retain reconsideration, reflection and maintenance, but names their exact configurations and counts their outcomes and costs separately. It must not attribute another model's successful repair to the experimental checkpoint.

No experiment edits a shared live world, resets accepted character identity, scripts a preferred choice into biography, changes a production default or enables external-player exposure automatically. Actual episode trials retain independent NPC choices, original unsuccessful attempts and current acceptance criteria.

### J4 — Switch a model and preserve past truth

To compare another checkpoint, the operator prepares another immutable deployment revision and starts a new experiment cohort. A server restart or controlled profile activation fences the old profile for new work; admitted requests retain their original profile, target, costs and request identity. Old results cannot publish into a restored or replaced world generation.

Past speech, actions and memories remain the accepted records produced at the time. They are not regenerated by the new model. The deployment reference and host credentials are operational configuration outside gameplay saves. Restoring a save does not restore access to a revoked deployment, restart old model calls or rewind real financial obligations.

### J5 — End an experiment and see its actual cost

The developer stops new experiment admissions and reconciles already accepted Runs. The experiment's operator then stops its separately owned managed allocation through Macrofold. For an imported endpoint, Macrofold stop closes use and cancels its requests; the external owner separately stops the host and controls its bill. Game shutdown cancels only the game's known work; it does not destroy capacity shared with another caller.

The report separates per-request charges, deployment startup/busy/idle/storage cost, other model calls, and remaining uncertain obligations. A zero request charge is compatible with a nonzero GPU bill. A stopped UI or timed-out request is not proof that compute billing stopped. A finite RunPod allocation is a planning budget with disclosed residual shutdown/billing risk, not a provider-guaranteed absolute dollar cap; a study requiring that hard guarantee cannot select this mode. The full-cost comparison uses one allocation total once, not a full GPU charge duplicated for every concurrent character.

## 4. First delivered capability and explicit extension seams

| Capability           | Selected first delivery                                                                                                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hugging Face source  | Macrofold accepts a model reference for assessment and pins actual compatible artifacts/runtime; OpenLegend does not download weights.                                                              |
| Generation           | Strict JSON-schema generation for gameplay and structured benchmarks; explicitly labeled raw-text generation for offline expression review only, through the existing immediate inference endpoint. |
| OpenLegend selection | Explicit server-owned fast/complex NPC response purposes and standalone benchmark generation.                                                                                                       |
| Deployment hosting   | RunPod load-balanced Serverless REST v2 with a pinned vLLM recipe first, plus explicitly configured and qualified imported endpoints; the caller uses the same provider-independent binding.        |
| Completion           | Completed, validated output first; transport streaming can be measured privately only when declared and qualified.                                                                                  |
| Context              | Existing installed context/schema, including complete required identity/evidence and permitted references.                                                                                          |
| Low-refusal research | Permitted-fiction expression, character agency, grounding and service boundary measured separately.                                                                                                 |
| Promotion            | Explicit operator decision after the applicable model, gameplay and release qualification; never automatic.                                                                                         |

An imported local llama.cpp endpoint is possible only when the selected Macrofold instance can reach its explicitly authenticated address: local Macrofold can serve a local endpoint, while cloud Macrofold cannot interpret its own localhost as the player's laptop. Publicly exposing a local runtime is not an automatic setup step. GGUF and other artifact formats require their own qualified runtime recipe; they are not accepted by relabeling them as a vLLM deployment.

Native decision-model deployment, arbitrary audio/image/video interfaces, automatic player-local setup, training/fine-tuning, multi-model tool harnesses, automatic model search, model-specific memory stores and per-NPC GPU processes are not required for this delivery. A generic chat endpoint does not implement Jev's typed score protocol. Future runtime recipes and role coverage extend the existing capability owner; they do not introduce an alternate gameplay executor.

Public progressive speech remains owned by [NST](../maintainers/npc-speech-streaming.md). An experimental model's SSE support is insufficient to enable public passages. When that project is installed, the model must qualify its exact record schema, bounded parsing and existing screening/publication contract. Without that qualification, a supported completed-output path may be used only under its own existing publication qualification.

The [situation-aware context project](situation-aware-cognition-context-tech-design.md) is an independent project. These experiments consume whichever current response contract is installed; they neither require completing SC first nor preserve two obsolete schema readers. A schema/compiler change creates a new comparison identity and requalification boundary.

## 5. Behavior on failure

| Failure or condition                                                         | Required visible/developer result                                                                                            |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Invalid or unauthorized deployment binding                                   | Reject the profile/request before model dispatch; no baseline substitution.                                                  |
| Ready model becomes unavailable, allocation expires or capacity is full      | Return the distinct unavailable/capacity outcome within the original deadline; independently admitted native work continues. |
| Required character context exceeds the model's qualified window              | Record a context-capability failure; do not remove identity, evidence or references to make a small model appear successful. |
| Unsupported strict schema, tools or reasoning option                         | Refuse the incompatible request; do not drop the option or silently change decoding mode.                                    |
| Invalid, truncated or invented action output                                 | Record model/transport failure separately from native rejection; publish no unadmitted effects and perform no paid repair.   |
| Deliberate character disagreement or uncertainty                             | Retain as a possible successful character response; not automatically counted as censorship.                                 |
| Explicit assistant refusal or quiet sanitization on permitted fiction        | Preserve the first answer and flag for the frozen review rubric; do not retry it with weaker instructions.                   |
| Provider/service output withholding                                          | Classify separately from the character's own choice; do not write it as a fictional experience.                              |
| Timeout/cancellation/lost acceptance                                         | Retain exact accepted Run or dispatch uncertainty, original deadline and financial holds; never resubmit unknown work.       |
| Observer permission, source evidence, actor life or world generation changes | Existing authority and freshness checks prevent stale disclosure/effects; accounting still reconciles.                       |
| Cost cannot be established or host shutdown is uncertain                     | Preserve the obligation and stop new funded admissions as the budget owner requires; never report free execution.            |

## 6. Qualification and adoption

The implementation is complete when both sides accept the same binding, request limits, terminal receipt and lifecycle cases; profile selection happens before reservations; old purposes retain their routing; and the experiment produces a truthful reproducible report through existing owners. Static schemas and injected outputs establish contract behavior only.

The first live study must establish exact artifact/runtime/template support, usable strict schema, observed output-token accounting, cancellation, unavailable capacity and a bounded whole-allocation cost. It then compares the frozen expression/agency cases before longer real native episodes. The [technical design](model-experiments-tech-design.md) specifies the manifest, scenario matrix, report and stage gates; the tracker retains which evidence is actually unrun.

Production adoption is a separate evidence-based decision. No model wins from an uncensored label, refusal count, popular demo, valid JSON or isolated tokens-per-second number. A candidate must improve the intended permitted expression without unacceptable loss of individuality, evidence fidelity, action reliability, privacy or cost/latency. Retain severe errors and failed coverage rather than average them away. Broader human enjoyment, long-term character quality and scale remain with CE/CR/AG, FPV and PF/PS.

The accepted [content and companion-safety requirements](../agent-content-and-companion-safety.md) stay in effect. Internal controlled model evaluation is distinct from external-player operation; the existing PD07/PD08/PD10 release owners retain their gates. This project does not add a new content policy or require solving unrelated release work merely to inspect private experimental outputs.

## 7. Decisions and remaining evidence

The architecture and initial scope above are selected for the design: Macrofold owns generic model deployments; OpenLegend remains an authorized inference consumer; roles and artifacts are pinned; experiments submit once and preserve the game's authority; host allocation and request costs remain distinct. No default NPC model changes as part of design or implementation alone.

No developer answer is required to implement these mechanics. Exact model revision, hardware availability, account access, allocation budget/lifetime and study cohort are concrete run inputs chosen and validated before each paid launch. Which checkpoint is best, its observed capability/latency, and whether a candidate should be promoted require later evidence; they are not unresolved wire-contract decisions.

## Maintained records

- Implementation and verification: [MX — model experiments](../maintainers/model-experiments.md).
- Technical counterpart: [Model experiments technical design](model-experiments-tech-design.md).
- Limits and constraints: [Model experiment inventory](../limits/model-experiments.md), with existing [AI execution limits](../limits/ai-execution.md) and [cognition limits](../limits/cognition.md).
- Research preparation coverage: [NPC research design map](../maintainers/npc-cognition-research-needs-design.md), selected deployment, low-refusal rubric and model-screen preparation only.
- Existing semantic and release owners: [AI providers](../ai-providers.md), [character experience](../maintainers/character-experience.md), [cognition](../maintainers/cognition-redesign.md), [public speech](../maintainers/npc-speech-streaming.md), [production deployment](../maintainers/production-deployment.md).
