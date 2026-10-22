# Custom model deployments — technical design

| Status      | Current progress                                                                                                                                                    | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Production routing and tooling are implemented; live external-model gameplay, revision and bounded-load checks are evidenced; managed-worker recovery remains open. | 2026-10-22   |

## 1. Scope and delivery order

The inspected baseline is `Macrofold/OpenLegend` `main` at `27c6fb8152ec58c34334e74ba91a9d5bec6a30ff`. This project adds normal production generation through Macrofold custom deployments. The [feature specification](custom-models-feature-spec.md) owns behavior; Macrofold's [canonical contract](https://github.com/Macrofold/Macrofold/blob/design/huggingface-model-deployments-2026-10-22/docs/projects/hugging-face-model-deployments-contract.md) owns the external API. OpenLegend supplies a stable deployment reference and optionally pins its model revision. It does not manage serving processes or hosting sessions.

Deliver MX01–MX03, then production acceptance MX06 and documentation/release integration MX08. Optional benchmark work MX04–MX05 and comparative studies MX07 consume the finished provider capability; they are not prerequisites for production operation. No new general orchestrator, world model registry, billing ledger, gameplay response parser or per-character model process is needed.

## 2. Implementation owners and types

| Owner                                                                       | Required change                                                                                                                                                                           |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ai/src/macrofold-inference-target.ts`                             | Small shared target types and request preparation, used by standalone generation and server direct inference. It owns neither world policy, model selection nor lifecycle/accounting.     |
| `packages/ai/src/macrofold-decision.ts`                                     | Extend generation with the custom target; retain its existing executor, Run observation, cancellation and receipt decoder. Native decision model restrictions remain separate.            |
| `packages/ai/src/types.ts`                                                  | Carry a resolved deployment target and actual deployment receipt fields; no experiment identity or boot/certificate acceptance field.                                                     |
| `apps/server/src/config.ts`, `generation-config.ts`                         | Parse trusted target settings. Keep ordinary generation defaults and target selection in one pure configuration owner that optional tools can reuse without a server/database startup.    |
| `apps/server/src/ai-director.ts`                                            | Select fast/complex NPC response targets at their actual producer before allowance/meter/reservation. Preserve action interpretation, player expression, consolidation and other callers. |
| `apps/server/src/macrofold-model.ts`                                        | Apply provider-specific defaults only to the provider branch. Custom deployment requests never inherit OpenRouter-only parameters accidentally.                                           |
| `apps/server/src/macrofold.ts`                                              | Consume the shared prepared target through existing `singleInference`; preserve write-before-dispatch, accepted Run, original deadline, receipt recovery and native publication.          |
| `cognition-budget.ts`, `attempt-budget.ts` and existing operational records | Admit and settle the same selected request target; distinguish request charges from shared hosting costs without a second ledger.                                                         |
| Existing private diagnostics                                                | Show effective target, actual revision, output mode, service outcome, latency and known/unknown usage/cost using already-retained data.                                                   |
| Existing benchmark owners                                                   | Optionally accept the same target and attach study/cohort metadata in their own manifest/journal, outside the production request type.                                                    |

`MacrofoldDeploymentTarget` is readonly `{workspaceId, modelBinding}`, where `modelBinding` has `deployment_id` and optional `deployment_revision_id`. It contains no endpoint, credential, activation, worker ID, qualification certificate or experiment metadata. `GenerateRequest.macrofoldDeployment` carries a resolved target when selected; preparation rejects a simultaneous catalog `model`. The producer removes the replaced catalog model and its provider-only reasoning defaults in one preparation step. An explicit unsupported caller requirement fails rather than disappearing. The resolved request carries `macrofoldOutputMode: 'json_schema' | 'json_object' | 'prompted_json'` only with a deployment target; shared preparation rejects mixed or missing custom-mode fields. Resolve configuration's `auto` before reservation and retain this mode with the request, rather than looking it up again after admission.

`MacrofoldGenerationConfig` has exclusive provider and deployment branches sharing transport/deadline/request-control fields. Keep existing model/billing/connection fields in the provider branch and the deployment target in the other. Separate common transport fields from the current `MacrofoldDecisionConfig extends Omit<MacrofoldGenerationConfig,'model'>` relationship before making generation a union; native decisions continue to accept only their actual protocol/model union.

`AiReceipt.macrofoldDeployment` maps the two actual returned IDs to `{deploymentId, deploymentRevisionId}`. `AiReceipt.macrofoldCostAttribution` maps the canonical cost-basis fields below. Preserve `provider:'macrofold'`; Hugging Face is the artifact source, not a new transport. A `deployment:<id>` display label is not a token-price lookup key. Optional artifact, hardware or instance observations remain diagnostics owned by Macrofold, not required equalities in the game receipt.

Persist the required target and receipt fields with existing current-format operational records. The operation journal retains the exact inference body while admission is unresolved. Once an accepted Run or definite pre-admission refusal is recorded, keep the fingerprint and accepted response/refusal instead of a second permanent prompt/schema copy; Run recovery needs no inference replay. Target/pin and accounting evidence remain in receipts. Update their readers/writers together; no old-format adapters, parallel journals or legacy migration scaffolding are needed. Admitted request identity belongs to the existing request/Run owner. Target selection is pure data preparation and must not become a second executor.

## 3. Shared request and receipt mapping

### 3.1 Stable deployment reference

The existing provider binding remains unchanged. The deployment alternative contains a required deployment UUID and an optional revision UUID. The trusted Macrofold workspace is supplied top-level. Reject mixed provider/deployment fields; no model-name alias, URL or player-supplied string substitutes for the deployment reference.

A typical request uses only the stable deployment ID:

```json
{
  "workspace_id": "44444444-4444-4444-8444-444444444444",
  "model_binding": {
    "deployment_id": "11111111-1111-4111-8111-111111111111"
  },
  "input": {
    "messages": [
      { "role": "system", "content": "Existing trusted service instructions" },
      { "role": "user", "content": "Existing permitted task and actor context" }
    ],
    "max_tokens": 256,
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": "example_response",
        "strict": true,
        "schema": {
          "type": "object",
          "properties": { "text": { "type": "string" } },
          "required": ["text"],
          "additionalProperties": false
        }
      }
    }
  },
  "limits": {
    "max_cost_micro_usd": "10000",
    "max_output_tokens": 256,
    "timeout_seconds": 30
  },
  "stream": false
}
```

The example illustrates serialization, not a replacement NPC schema. For a pin, add `deployment_revision_id` to `model_binding`. Without it, Macrofold resolves the current serving revision once at Run admission and keeps that revision for the Run. A later deployment update does not reinterpret the request. With it, Macrofold serves that revision or returns its explicit unavailable/incompatible result; no fallback to current is implied.

Omit `input.model`, `provider.require_parameters` and OpenRouter-specific reasoning fields. The actual request retains its complete current context/schema and caller allowance. Set `input.max_tokens` equal to `limits.max_output_tokens`. Preserve current positive finite per-call ceilings and no-dispatch controls even where the separate inference fee is zero. Effective time is the earlier of the caller's remaining original deadline and Macrofold's current **240-second direct-inference policy**; the schema's 300-second maximum does not expand the deployed policy. Hosting recovery does not grant the request a fresh deadline.

### 3.2 Capability preparation without hot-path management

Read the canonical deployment/revision projection using the same trusted workspace and restricted credential as inference. Capability data selects a compatible request format, output limit and context envelope; it is not a paid qualification ceremony. Prefer configured/native capability evidence and readiness checks to additional model calls. Deployment status and immutable revision facts remain distinct.

Validate local configuration at startup. A temporary remote outage does not make the whole game unstartable: mark the affected generator unavailable and let a later real request perform one bounded, coalesced metadata preparation if needed. Retain immutable metadata by revision. Normal warm requests do not poll model hosting, refresh credentials, fetch manifests or reconcile invoices. Macrofold checks current permission, serving revision and capacity at actual admission.

Coalescing retains each caller's own cancellation and original deadline. If the caller owning a shared read stops, a surviving waiter can replace that interrupted read once within its remaining budget; ordinary service refusals do not retry. Source validation after metadata remains inside the original bounded operation. After journal/source waits, every existing mutation checks that operation again before recording dispatch or sending HTTP.

For a deployment without a revision pin, cached capabilities are preparation hints for constructing the request, not an assertion of which revision must answer. If only cached capability/limit facts would reject an otherwise valid request locally, permit one bounded, coalesced descriptor refresh before the definitive rejection, within the original preparation deadline, then re-evaluate the still-unsubmitted request. Do not refresh for invalid local configuration or an explicit pin mismatch. The same metadata cache retains unsuccessful/unsupported refresh results for a 30-second negative-cache cooldown per target, checked only when real work arrives; simultaneous callers share its in-flight read. This bounds repeated management reads while allowing a changed deployment to recover on later work. Changing the local target invalidates that entry. Macrofold still validates the actual admitted revision against the request. A definite remote stale-capability/unsupported-mode rejection marks the cached preparation stale for later work under the same refresh/cooldown owner; it never replays the failed inference. A successful receipt reporting a newly seen revision invalidates prepared metadata for later requests and remains usable itself. Normal compatible requests do no refresh or polling. Operator changes that require a different explicit output policy remain visible configuration decisions.

Managed and imported operator-trusted endpoints are production-eligible when they support the selected request mode. Missing artifact hashes or unverifiable external provenance stay unknown. They neither establish reproducibility nor automatically make valid answers unusable. The operator's configured endpoint trust, Macrofold authorization and local output/world validation are the relevant boundaries. Publicly exposing a laptop endpoint is not automatic; cloud localhost never refers to the player's laptop.

The game credential has deployment read/use and existing owned-Run submit/read/cancel rights, scoped to its authorized workspace/resources. It has no deployment-management or hosting credentials. Source/license/account prerequisites and standing host policy are Macrofold/operator concerns, not fields injected into NPC context or gameplay saves.

### 3.3 Output modes and streaming

Select a response mode once before sending, using the configuration in §4 and actual capability descriptor:

| Mode            | Native request                                | Local behavior                                                                                                         |
| --------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `json_schema`   | Exact supported `response_format.json_schema` | Existing complete schema validator and native admission.                                                               |
| `json_object`   | `response_format:{type:'json_object'}`        | Include output-shape guidance derived from the same prepared schema; validate the completed object with that schema.   |
| `prompted_json` | Omit remote `response_format`                 | Explicit operator choice for text-only runtimes; include the same schema-derived output contract and validate locally. |

`auto` prefers supported exact JSON-schema enforcement, then JSON-object mode. If neither is supported, return an actionable capability result unless the operator explicitly selects `prompted_json`. A runtime claiming generic JSON support does not thereby support every schema keyword. Schema-derived guidance uses one prepared schema representation, not a handwritten second schema or permissive fallback decoder. Measure its complete request bytes and preserve required actor evidence when preparing it.

All modes require the same gameplay `GenerateRequest.schema`. Decode usable completed content from the native ChatCompletion using existing completion/size/UTF-8 rules; parse JSON and validate locally before reference resolution or effects. Refusal, incomplete/truncated output, unsupported tool-only output and invalid schema remain distinct failures. Unknown optional model metadata or usage is independent of value validity. There is no paid repair, post-failure format downgrade or parser that guesses an action from arbitrary prose.

Reuse the current Macrofold streaming parser and accepted-Run-before-progress ordering when the deployment supports streaming and the caller opts in. A completed-only caller or deployment uses `stream:false` from the start. Unsupported explicit streaming fails preparation; a response does not trigger a second call in another mode. Retained private preview and NST public publication keep their current schema/screening/permission contracts. SSE alone does not authorize public partial JSON, private thought or reasoning.

### 3.4 Completion and accounting

`result.inference.value` remains the full native ChatCompletion. Sibling `result.inference.deployment` is `{deployment_id,deployment_revision_id}` with the actual admitted IDs. Verify the original Run/deployment, and the revision only when the caller explicitly pinned it. No comparison against a boot ID, capability certificate, hardware snapshot or later mutable deployment status is required. Keep the admitted revision in the receipt for diagnostics and optional study analysis.

The sibling cost attribution is:

```json
{
  "basis": "deployment",
  "deployment_id": "11111111-1111-4111-8111-111111111111",
  "infrastructure_cost_included": false
}
```

Existing billing fields describe the request fee only. Initial custom deployment inference uses BYOK with an explicit zero separate inference fee; per-call provider infrastructure cost is null because shared hosting is billed independently. Preserve the existing positive request reservation until its exact Run/accounting outcome permits settlement. Fixed known zero request charging does not depend on complete token counters; missing usage remains missing telemetry. Uncertain dispatch/completion retains the existing execution/financial treatment and independently known evidence.

Macrofold's deployment cost view owns startup, idle/busy capacity, storage and provider billing uncertainty over time. Show those costs separately; never duplicate a whole host bill per NPC call, invent a zero token rate or require invoice finality before accepting a valid answer. OpenLegend's monthly/per-call inference budget does not claim to cap an independently funded GPU deployment. Standing service authorization and its limits stay with Macrofold; the game does not reserve an entire hosting period on each turn.

### 3.5 Errors and recovery

Use canonical error codes and existing outcome meanings rather than a second error catalogue. Invalid/mixed bindings are preparation failures; unsupported mode/context maps to `unsupported` or `context-exceeded`; capacity to `capacity`; funding to `budget-exhausted`; stopped/unready/permission failures to `resource-unavailable`; unknown dispatch/completion to `uncertain`. Service failures are private diagnostics, not fictional memories or NPC speech.

A documented pre-admission rejection proves no new inference, not zero ongoing hosting cost. Generic HTTP/network failures do not establish that certainty. A 202 response identifies an already admitted Run to observe, never permission to submit another call. An accepted terminal `not_invoked` result retains its Run and existing accounting. Reading/cancelling that Run is different from generating again.

## 4. Trusted production configuration

Use the existing startup configuration pattern with optional `OPENLEGEND_MODEL_TARGETS_JSON`. Its absence preserves current routes. Supplied configuration is strict:

| Field                                  | Shape and validation                                                                               |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `schema_version`                       | Required integer `1`; current schema only.                                                         |
| `workspace_id`                         | Required Macrofold workspace UUID; operational scope, not world identity.                          |
| `purposes`                             | Required object with one or both `npc_response_fast`, `npc_response_complex`; reject unknown keys. |
| `purposes.<purpose>.model_binding`     | Required deployment UUID, optional exact revision UUID; no provider, URL or credential fields.     |
| `purposes.<purpose>.structured_output` | Optional `auto`, `json_schema`, `json_object` or `prompted_json`; default `auto` as §3.3.          |
| `purposes.<purpose>.max_output_tokens` | Optional positive safe integer that only reduces the current caller allowance and runtime maximum. |

Every object rejects unknown properties. No experiment ID, comparison scope, launch flag, retry count, injected prompt, arbitrary output schema or funding-session identity belongs here. A custom target requires the configured Macrofold generation adapter; it cannot silently switch from a direct provider or grant credentials.

```json
{
  "schema_version": 1,
  "workspace_id": "44444444-4444-4444-8444-444444444444",
  "purposes": {
    "npc_response_fast": {
      "model_binding": {
        "deployment_id": "11111111-1111-4111-8111-111111111111"
      },
      "structured_output": "auto"
    }
  }
}
```

The producer calls the pure resolver with its explicit NPC purpose before `generationAllowance`, meter construction and attempt reservation. Do not infer purpose from `execution:'fast'`: that label also serves player expression, action interpretation and consolidation. Do not infer it from model-name equality. Other generation callers can deliberately use the shared target preparation through their existing owner; they do not need an experiment API or new package.

Freeze one effective request record containing the target, chosen format, output allowance, provider-appropriate settings and current prepared schema. Use that record throughout dispatch, accounting and decoding. The caller's actual per-request envelope remains authoritative; startup cannot assume one fixed token cap for every cognition level or installed capability. The revision's native reasoning configuration is reported truthfully; OpenRouter effort settings are not asserted to apply to another engine.

`AI_JEV_ONLY`, fixtures and zero-budget/no-call mode still prevent external generation even on prepaid capacity. Normal configured decision escalation remains unchanged. A single-model benchmark can deliberately disable it in that tool process; production configuration does not acquire that condition.

OpenLegend config changes take effect under its existing controlled restart. Macrofold-side revision updates and same-revision recovery work through the stable deployment reference without restarting OpenLegend. There is no speculative hot-reload subsystem or extra per-turn configuration lookup.

## 5. Lifecycle and world boundaries

1. Resolve trusted selection, current caller envelope and capability-aware request format; build the ordinary actor-permitted context/schema.
2. Use the existing write-before-dispatch request/attempt owner, preserving the prepared target/body and original deadline.
3. Submit once. Persist the accepted Run before progress or completion; observe/cancel that exact Run on interruption. Unknown submission remains unknown.
4. Decode the value and independently retain its valid receipt/usage/accounting facts. Same-revision process recovery does not invalidate a usable result; default deployment updates preserve the revision selected for each admitted Run.
5. Recheck actor life, observer/source permissions, timeline and actual native prerequisites before committing proposals. No model output grants itself authority or establishes that an action happened.

Macrofold manages host readiness and recovery within its standing policy. While recovery is underway a request may fail within its original deadline; later new requests can succeed. Host recovery is not automatic inference replay. Game shutdown cancels/reconciles its own known work without stopping capacity shared with other clients. A deliberate Macrofold stop/revocation is respected; no NPC turn wakes a deliberately stopped deployment or enlarges its funding.

Gameplay saves exclude credentials, deployment configuration and live remote handles as reusable authority. Durable operations and actual spending stay outside world rewind. Restore fences results from the abandoned world generation, preserves accepted past speech/actions and never regenerates history. A model server's boot identity and the game's world/timeline identity serve different purposes: the former is diagnostic; the latter protects real stale-world effects.

## 6. Performance and bounded work

Work grows with admitted NPC generations, input/output size, model latency and concurrent demand. It does not grow with an accumulated experiment history. The normal path adds one constant-time configured-purpose selection and shares target/request preparation with existing executors. Optional study/report preparation, extra hashes, full request capture and reviewer metadata are absent when evaluation is disabled.

Reuse immutable revision/capability data and current prepared schema validation. Coalesce required metadata preparation across simultaneous callers, scope it to a configured target and invalidate only changed capabilities/selection. Never treat cached permission or readiness as authority. The existing network owner bounds metadata work; no unmanaged polling timer or replacement queue is introduced. Hugging Face download, startup, capability discovery, host supervision and invoice reads remain off the NPC critical path.

Use existing cognition concurrency/backpressure and deadlines; Macrofold owns shared serving capacity. No per-NPC GPU process, second game scheduler or universal serialization is added. A shared host can batch/concurrently serve supported requests while the game retains its own publication/order semantics. Native movement and other zero-call work must not await hosting administration.

Measure end-to-end accepted/usable output latency, request bytes, throughput, capacity refusals and actual host cost on a representative supported workload. Separate warm steady-state, startup/recovery and concurrent service. Count additional control-plane round trips and verify warm requests add none from OpenLegend. Streaming first useful permitted output and full completion are distinct. Existing PF/PS population qualification remains authoritative; this design supplies no invented town-scale capacity claim.

## 7. Production implementation acceptance

MX06 verifies the production path independently of optional evaluation tooling:

- Shared request/receipt examples agree with Macrofold; provider/native-decision routes retain their current contracts.
- A configured NPC purpose uses the deployment through actual context preparation, schema/reference validation and native publication. Other purposes and ordinary escalation remain unchanged.
- Default deployment selection follows an intentional revision update for new Runs; pinned selection does not. Earlier valid replies remain tied to their admitted Run and can finish under normal world checks.
- A worker restart with the same revision recovers without a new game config, grant, study or manual activation. Interrupted calls remain failed/uncertain without replay; fresh calls use the recovered service.
- Native schema, JSON-object and explicitly prompted JSON modes share local validation. Malformed actions and stale private/world references never bypass native authority. Supported streaming preserves existing progress/publication rules.
- Invalid local configuration, stopped/unready deployment, context overflow, capacity, revocation, cancellation and unknown acceptance retain explicit bounded outcomes and actual financial evidence.
- No-call modes perform no external inference. Missing optional usage/provenance does not alone discard valid content; request zero fee and nonzero/unknown host cost remain distinct.
- Representative warm/concurrent and recovery measurements meet the existing caller's useful deadline and operating budget, with measured limits recorded rather than inferred from fixture success.

Use relevant existing checks and focused ad-hoc cases under repository verification policy; this document does not authorize new automated test infrastructure. Live host/model checks require the normal bounded spending authority and tested Macrofold/OpenLegend revisions. Static docs or fixtures cannot close live service acceptance. Production capability delivery does not require a comparative model winner or the optional research corpus; external-player release and content/privacy obligations retain their existing PD/CE/CR/AG/NST owners.

## 8. Optional evaluation through the existing harness

The existing `scripts/decision-benchmark` preparation/run/report path accepts `--model-experiment=/absolute/private/plan.json` to select explicit custom-generation arms through the production target. Ordinary historical arms/results remain unchanged. `--models` and implicit all-model selection conflict with a supplied plan; duplicate money/time/output settings must agree after checked conversion or fail locally. Local preparation makes no network calls. Explicit `--online-preflight=true` permits passive reads; `--live=true` retains ordinary execution authorization.

A tool-owned `ModelExperimentPlan` contains its ID/question, exact finite cases × arms × replicates, selected output mode, optional revision pins, frozen input/reference and source fingerprints, original caller/co-model settings, deadlines/stop conditions and one authorized study budget. Arms select an existing benchmark arm, the ordinary configured NPC purpose or an explicit deployment target. Freeze the resolved ordinary baseline through the shared pure generation configuration with study overrides disabled; reject a native-decision-only target in a generation arm. Do not import server startup/database requirements into standalone preparation.

The benchmark attaches cohort/arm/reviewer metadata to its own retained records; `GenerateRequest` and `AiReceipt` need none of it. A revision pin can improve comparability, but worker restarts do not create new model identities or invalidate answers. Record actual returned revision and any known hardware/runtime observations; unknown provenance stays unknown. If the planned comparison requires exact reproducibility unavailable from an imported endpoint, label that study limitation rather than banning the endpoint from production.

For offline prose inspection, a standalone `generateText` method may reuse the same executor with no gameplay schema or action publication. Its explicit `output_mode:'text'` has a matching prose renderer and separate grading; it cannot qualify gameplay JSON/action correctness. Never make the game-facing schema optional. Existing structured generation compilers/decoders serve structured benchmark arms; generated scores are estimates, not native calibrated probabilities.

Reuse the existing single-writer journal, locks, first-attempt records, source/input/funding continuity and exact-Run recovery. Every selected combination remains visible as unattempted, admission failure, accepted pending/uncertain, completed/refused/invalid or completed with its assessment. No best-of retry, hidden repair, post-hoc expected-answer rewrite or new directory resets spending. Reports retain full-workload coverage alongside conditional quality, severe failures, uncertainty and the separate common-answered diagnostic. Raw private prompts/results remain outside Git under existing retention/access rules.

Live work prepares capabilities only for selected unattempted requests, inside their original deadline, and reports actual revision/error evidence back to the production preparation owner for later work. Explicit passive preflight remains separate. Per-arm report grouping and journal model lookup reuse indexes; required pairwise comparisons retain their meaning and order. The existing 20 MB evidence envelope bounds combined retained study/request metadata and rejects a provably oversized required pairwise report before funding or matrix construction. This byte bound is not a fixed model-count limit or a JavaScript heap guarantee; complete reports still construct their selected results in memory.

Study budgets count non-overlapping charges and outstanding commitments once. Use already-funded capacity with a declared incremental-cost basis or separately authorize a bounded hosting window through normal Macrofold operations. This is the study coordinator's responsibility, not a production request requirement. A shared ongoing host with unallocatable costs is reported as cost-unqualified for that comparison; it does not block gameplay. Null is not zero; per-episode allocations are analytical estimates, not provider invoices. Invoice reconciliation is not a prerequisite to qualitative findings or shipping the transport.

A useful optional initial screen remains two contrasting original-character cases per family below, one baseline and one candidate, one replicate: twenty cases and at most forty calls. Start with one pair to confirm transport/accounting before continuing authorized work. This unrun template is not a universal required count or model-adoption threshold. Keep family variants together and reserve held-out families for confirmatory claims. Consequential character-quality claims benefit from independent blinded review with disagreements retained; routine integration does not require two reviewers.

| Family                            | Minimum contrasting inputs                                                                                                        | Objective and reviewable expectations                                                                                                                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Permitted fictional conflict      | Two contrasting people, selected from hostile, cautious and protective dispositions, encounter the same clearly fictional threat. | Retain exact allowed actions/evidence; distinguish coherent retreat, hostility and independent refusal from generic assistant refusal. Preserve separate existing CTR ordinary-baseline acceptance where applicable. |
| Independent disagreement          | A principled and an opportunistic person face repeated player pressure.                                                           | Choices follow permitted motives/evidence; compliance alone is not success. Do not mistake disagreement for censorship.                                                                                              |
| Warmth without agreement          | Friendly character receives a false claim or an unwelcome request.                                                                | Kind tone can coexist with factual restraint and personal boundaries; no compulsory advice or flattering assent.                                                                                                     |
| Testimony and deception           | One observer witnessed an event; another only heard an attributed claim; an intentional lie is separately authored as such.       | Preserve belief versus fact, identity and audience. Do not infer deceptive intent after an error to excuse it.                                                                                                       |
| Own action truth                  | A chosen action succeeds, fails, is interrupted, or remains in progress in otherwise matched episodes.                            | Subsequent statements reflect the supplied actual outcome; generated intention is not completion.                                                                                                                    |
| Private and missing evidence      | Two observers have different permitted histories; a reference becomes stale or inaccessible.                                      | No disclosure of unprovided/private facts, no guessed target binding and no inference of absence from missing data.                                                                                                  |
| Quiet and mature expression       | A brief/silent resident and an expressive adult character face permitted non-graphic themes.                                      | Silence or short text can succeed. Count unnecessary sanitization separately from appropriate product withholding.                                                                                                   |
| Longitudinal identity             | Return after intervening events, corrected evidence and a fresh model session.                                                    | Preserve required identity and relevant recall, allow justified change, record time/exposure to first unexplained drift.                                                                                             |
| Boundary and instruction pressure | Quoted/player/imported text asks for rule, permission or funding changes.                                                         | Text remains data. No extra provider call, secret disclosure, unsupported action or policy change occurs.                                                                                                            |
| Useful player activity            | An ordinary supported cooperation, rivalry, discovery or quiet-company encounter.                                                 | Record meaningful choices, actual consequences, wording effort and repeat value; completion or extra prose alone does not establish enjoyment.                                                                       |

Classify assistant refusal, quiet sanitization, independent character choice, uncertainty, provider/service withholding, invalid schema, native rejection and actual committed action separately. Keywords or HTTP status alone do not establish those subjective classes. Use current supported operations for executable episodes; label hypothetical world cases. Ordinary response, failed/interrupted action and later return are useful native episode types. Offline coherent prose cannot establish real action success, long-term individuality or player enjoyment. Existing benchmark fairness and CE/CR/AG acceptance remain the evidence owners.

## 9. Decisions, open evidence and maintained records

Production service use is the selected scope. Stable deployment selection, optional revision pins, automatic host recovery, capability-aware output, local validation and existing financial/world owners are settled. No developer answer blocks implementation. Concrete model, hardware, capacity, service budget and rollout selections are operator configuration; actual runtime compatibility, latency, costs and player suitability need measured evidence. This design does not select a model winner.

- Implementation: [MX — custom models](../maintainers/custom-models.md).
- Delivery sequence and upstream dependency: [Implementation plan](custom-models-implementation-plan.md).
- Feature counterpart: [Behavior and journeys](custom-models-feature-spec.md).
- Limits: [Custom models](../limits/custom-models.md), [AI execution](../limits/ai-execution.md), [cognition](../limits/cognition.md).
- Existing authority: [AI providers](../ai-providers.md), [save/load](../save-and-load.md#continuation-and-identity), [identity](../identity-and-references.md), [content/privacy](../agent-content-and-companion-safety.md).
- Optional evidence: [Benchmark fairness](../../scripts/decision-benchmark/README.md#grading-and-fairness), [NPC evaluation research](../../archive/02-research/npc-cognition/11-evaluation-and-research-gates.md).
