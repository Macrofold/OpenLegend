# Custom model deployments — feature specification

| Status      | Current progress                                                                                                                     | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| In progress | Native judgment, chat routing and tools are implemented; live Kev/Huihui qualification is blocked by current application-key access. | 2026-10-24   |

## 1. Purpose and selected outcome

OpenLegend can use an operator-selected Hugging Face model for native character judgments and ordinary production NPC generation. Macrofold hosts the model or connects an existing compatible endpoint; the game uses it through its existing AI boundary. A deployment can serve the game continuously, recover from a model-server restart automatically, and support a deliberate model update without creating a new experiment or changing game rules.

Performance, functional model choice and reusable provider integration are the primary goals. Experimentation is an optional consumer of the same capability. A production request needs no study manifest, experiment ID, frozen hardware, qualification certificate or human approval after an ordinary restart. Comparative studies do not determine the shape or lifetime of the production service.

“Any Hugging Face model” means any repository can be submitted for compatibility assessment. Actual execution depends on downloadable artifacts, permitted use, sufficient hardware and a supported runtime. Unsupported task types or architectures receive a specific result; the platform does not silently substitute another model. Models described as uncensored or low-refusal are selectable on the same terms as other models. The label neither changes the game's authority nor proves better characters.

## 2. Ownership and existing behavior

The original custom-model implementation began at `Macrofold/OpenLegend` `main` `27c6fb8152ec58c34334e74ba91a9d5bec6a30ff`. The native decision extension uses the newer `origin/main` integration base `a60f15ac4`, recorded in the [implementation plan](custom-models-implementation-plan.md#native-kev-and-huihui-integration). Macrofold generation uses `/v1/inferences`, durable Run identity, local structured-output validation and per-request accounting. The existing fast and complex NPC reply settings select chat deployments. The native decision extension selects a SystemOne deployment for existing named judgments; omitted purposes retain their provider settings. [AI providers](../ai-providers.md) owns installed routing, while [MX06](../maintainers/custom-models.md#mx06--production-contract-recovery-and-operating-acceptance) identifies the remaining operating qualification.

The canonical [Macrofold deployment contract](https://github.com/Macrofold/Macrofold/blob/design/huggingface-model-deployments-2026-10-22/docs/projects/hugging-face-model-deployments-contract.md) owns hosting, source/runtime configuration, current deployment selection, permissions, readiness, recovery, capacity and infrastructure costs. OpenLegend owns model selection for each game purpose, actor-permitted context, local response validation, native action admission and publication. The game receives a restricted deployment reference, not Hugging Face or hosting credentials.

`packages/ai` provides reusable typed inference; `apps/server` selects targets and owns the existing request lifecycle; `packages/domain` remains deterministic and provider-independent. Model choice is operational configuration outside world saves. World laws, character identity, permitted observations and action effects continue through their existing authored and native owners. Another world can use the same model connection without inheriting the bundled world's rules or vocabulary.

## 3. Operator and player journeys

### J1 — Connect a model for normal operation

The operator supplies a Hugging Face repository or URL to Macrofold, selects a supported runtime and affordable hosting configuration, then starts the deployment under its standing spending and capacity policy. Managed RunPod load-balanced Serverless uses the native Kev runtime for judgments and vLLM for chat. An existing authenticated SystemOne decision or OpenAI-compatible chat endpoint can also be registered, including a locally hosted runtime that the chosen Macrofold installation can actually reach.

Macrofold maintains desired running/stopped state and readiness. Warm production capacity avoids downloading or starting a model during each character response. Provider recovery stays inside the approved service configuration and spending policy. Stopping OpenLegend does not destroy a shared host; stopping a deployment explicitly in Macrofold does not automatically restart it on the next NPC request.

The operator grants the game principal read/use access in the trusted Macrofold workspace and configures its judgment and NPC generation targets independently. Embeddings, reflection and full-agent execution keep their existing routes. No production model default changes merely because this design or its implementation is merged.

### J2 — A character uses the selected model

When a character needs a native judgment, the existing decision adapter submits the same permitted state and independent named questions to the configured SystemOne deployment. Choice, continuous Score and Noul answers retain their ordinary consumers, probabilities and uncertainty. Native decisions do not become chat generation or authorize game effects.

When an NPC needs a generated response, the server selects the target for that request's purpose, assembles the ordinary permitted context and current response schema, and submits through the existing inference route. Fast and complex NPC response targets can be configured independently. An omitted target uses its existing setting; invalid supplied configuration fails visibly.

OpenLegend prefers native JSON-schema output when supported. JSON-object or explicitly selected prompted-JSON output can serve models without that feature; all modes use the same complete local schema validator and action admission. A weaker remote output guarantee may cause more invalid replies, but does not require a second gameplay parser or authority path. The selected mode is fixed before the request; a failure does not silently trigger another model call or downgrade.

The answer follows the same reference resolution, current-world checks and publication rules as any other generator. Ordinary configured decision escalation remains separate and unchanged. A host lifecycle failure does not create another escalation entitlement. Native movement and already-admitted work continue under their existing owners while model service is unavailable.

### J3 — Recover from an ordinary restart

If the serving software restarts and loads the same configured model revision, Macrofold checks readiness and resumes service automatically. The game retains its deployment reference. No experiment/profile restart, new funding session or manual model approval is required solely because a process restarted, credentials rotated, or an equivalent worker replaced it.

A valid completed answer remains usable under its original request, deadline and world-authority checks. Process IDs, worker boot IDs, hardware observations and diagnostic metadata do not independently invalidate it. A crash that interrupts an answer can still leave a failed or uncertain request; recovery never secretly replays that request. Later new requests can use the recovered service normally.

### J4 — Update or pin the model

A normal target selects a deployment by stable ID. Macrofold resolves its current serving revision once when admitting each Run. An operator can deploy a new model revision through Macrofold; new game requests then use it, while already-admitted requests retain their selected revision. Their valid answers are not discarded simply because a newer model became current.

An optional revision pin selects one exact model/runtime configuration for operational rollback, a controlled rollout or a comparison. It does not pin a process, GPU instance or hosting authorization period. The requested pin never falls back to a different revision. Macrofold determines whether that revision is currently served; a stopped or unavailable revision returns an explicit outcome.

OpenLegend configuration changes follow its existing controlled-restart pattern; deployment-side recovery and updates do not require restarting OpenLegend. Past dialogue, actions and memories retain the outcomes actually accepted at the time. Restoring a world does not replay model calls, regain revoked credentials or rewind bills.

### J5 — Compare models when useful

The [current candidate inventory](../../research/ai-models/README.md#a-small-starting-panel) and [experience questions](../../research/ai-models/README.md#choose-candidates-for-a-worthwhile-encounter) help choose one useful contrast. Research interest, route availability, commercial terms and actual game qualification remain separate. Optional voice casting and delivery use [HE07](../maintainers/hearing-and-speech.md#he07--optional-speech-media-and-selected-hearing-extensions), not this generation harness by implication.

The existing benchmark can select the same generation target, optionally pin its revision, and compare it with the configured ordinary NPC model. Local preparation is offline; explicit online preflight and live execution retain their current authority and cost controls. Existing journals preserve first attempts, failed/unattempted cases, actual revisions, latency and known/unknown costs.

The [optional evaluation design](custom-models-tech-design.md#8-optional-evaluation-through-the-existing-harness) preserves the low-refusal/agency rubric and useful native episodes from the October 20 research. It is not required to configure, deploy, recover or operate the production feature. Selecting a model for players still requires appropriate operational and gameplay judgment under the existing release owners; no fixed corpus, two-reviewer ceremony or experiment certificate is a universal runtime gate.

## 4. Scope, extensibility and performance

| Area               | First delivery and boundary                                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reusable inference | One deployment-target alternative shared by native decisions, server generation and standalone adapters; no experiment-specific transport or executor.            |
| Game integration   | Independent native judgment and fast/complex NPC response selection through trusted configuration; further producers retain their existing context and authority. |
| Hosting            | Macrofold-managed RunPod native Kev or vLLM, plus operator-trusted protocol-compatible endpoints. Other runtimes extend Macrofold's provider ports.               |
| Output             | Native named-answer validation for judgments; existing strict local response schema for chat. SystemOne is completed-only; chat streams only when supported.      |
| Lifecycle          | Persistent desired service state, automatic same-revision recovery, deliberate updates and optional revision pins. No boot or study identity in game admission.   |
| Cost               | Existing per-request accounting plus separately displayed shared deployment cost; no GPU bill multiplied by NPC count.                                            |
| Evaluation         | Optional benchmark arms and reports using the production target, with no mandatory hosting orchestration or experimental data collection.                         |

Reuse prepared target/capability data; do not perform Hugging Face lookups, hosting-status polls, invoice reconciliation or experiment bookkeeping on each NPC turn. Bound requests through the existing scheduler, network owner and original deadline. Avoid an additional game-side queue or per-NPC model process. Macrofold owns serving concurrency and capacity; increasing GPU capacity does not silently raise the game's existing cognition concurrency.

Streaming transport does not grant public speech authority. Retained private preview and [NST public speech](../maintainers/npc-speech-streaming.md) each keep their existing parsing, screening and publication rules. A completed-output-only runtime remains usable. No extra call obtains token counts or repairs malformed output.

Native Jev-style scoring uses its actual SystemOne protocol. Chat remains a separate protocol; neither substitutes for the other. Embeddings, arbitrary multimodal interfaces, full tool harnesses, automatic player-local setup, training and fine-tuning remain outside this integration. It also does not require completing the independent [situation-aware context project](situation-aware-cognition-context-tech-design.md); it uses whichever single current schema/context contract is installed.

## 5. Failure behavior and release acceptance

| Condition                                                       | Required behavior                                                                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Malformed target configuration                                  | Fail local configuration with a useful field error; no silent baseline substitution.                                                  |
| Temporary serving/control-plane unavailability                  | Report the selected generator unavailable; later new work can recover without configuration changes or a game restart.                |
| Unsupported output mode or required context too large           | Refuse the incompatible request before dispatch when known; preserve required context and local schema.                               |
| Capacity, request deadline or deployment spending limit reached | Use the existing distinct bounded outcome; no fresh deadline, hidden queue or paid replay.                                            |
| Valid same-target answer after worker restart/update elsewhere  | Accept under its original Run and world checks; do not reject diagnostic changes.                                                     |
| Invalid/incomplete model output or stale game authority         | Preserve outcome/accounting, withhold unadmitted effects and use existing failure behavior.                                           |
| Missing usage or unresolved hosting bill                        | Preserve unknown financial/diagnostic values; do not label free hosting or discard an otherwise valid answer solely for that absence. |

Production integration acceptance covers native multiple-question Choice/Score/Noul decisions and real NPC generation through their independently configured deployments, ordinary and pinned selection, same-revision recovery, deliberate model update, cancellation/uncertainty, strict local validation, existing escalation isolation, representative warm/concurrent load and honest costs. Runtime fixtures establish contracts; live provider/game checks establish their measured operating scope. Experiment reports are not dependencies of this acceptance.

Existing [content/privacy and companion requirements](../agent-content-and-companion-safety.md), PD release work and CE/CR/AG gameplay evidence retain their owners. “Low refusal” is not permission to bypass those requirements. No claim of production capacity, character quality or live-host acceptance follows from this design alone. Official `jaredpalmer/kev-4b` is a native decision checkpoint, not an uncensored model. The pinned Huihui chat model has upstream imported-endpoint evidence; its protected managed chat runtime remains unqualified. [Operator setup](../live-ai-setup.md#use-existing-model-deployments-for-decisions-and-replies) records exact sources and separates upstream evidence from this game's current-service checks.

## Maintained records

- Implementation and acceptance: [MX — custom models](../maintainers/custom-models.md).
- Authorized delivery sequence: [Implementation plan](custom-models-implementation-plan.md).
- Technical counterpart: [Custom models technical design](custom-models-tech-design.md).
- Limits: [MX-L01–MX-L08](../limits/custom-models.md), [AI execution](../limits/ai-execution.md), [cognition](../limits/cognition.md).
- Research preparation: [NPC research design map](../maintainers/npc-cognition-research-needs-design.md).
