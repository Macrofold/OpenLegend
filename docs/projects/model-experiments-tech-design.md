# Hugging Face model experiments — technical design

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | The cross-repository implementation design is specified; no runtime, hosting or model-quality qualification has been performed. | 2026-10-22 |

## 1. Scope, baseline and implementation plan

The inspected OpenLegend baseline is `main` at `27c6fb8152ec58c34334e74ba91a9d5bec6a30ff`. This project adds an operator-selected custom deployment target to existing inference consumers and a reproducible comparison path. It changes no world laws, cognition trigger cadence, character identity, action execution, default model or production eligibility.

This assignment changes zero runtime logic lines. Future implementation crosses provider contracts, financial settlement and private model context; therefore its stages and checks are explicit. The paired [feature specification](model-experiments-feature-spec.md) owns journeys and selected scope. Macrofold owns the shared external protocol; this document owns the OpenLegend mapping and experiment behavior.

1. Implement and publish Macrofold's immutable deployment, exact capability, bounded activation, inference and allocation-receipt contract.
2. Introduce one typed target resolver and serializer shared by the standalone generation client and server direct-inference route; preserve native judgment and full harness behavior.
3. Add trusted purpose-specific experiment profiles, resolve their targets before reservation and capture admitted identity in existing operational records.
4. Extend the existing benchmark runner with explicit custom generation arms and allocation-aware whole-study accounting, preserving historical cohorts.
5. Qualify no-paid-call protocol/role/lifecycle cases, then separately authorized exact-runtime probes and controlled comparison episodes.
6. Reconcile the source-of-truth docs and tracker without presenting design or fixtures as live quality evidence.

No new general orchestration service, model registry in the world, polling loop in simulation, duplicate billing ledger or second gameplay response parser is needed.

## 2. Existing owners and concrete changes

| Owner | Current behavior | Required implementation |
| --- | --- | --- |
| `apps/server/src/config.ts` | Reads trusted environment, model strings, billing/connection settings and ordinary limits. | Read one optional strict experiment-profile setting; freeze it and reject unknown purposes or invalid target/parameter combinations. No browser input or world save configures a deployment. |
| `apps/server/src/ai-director.ts` | Selects NPC mini/complex model, also creates fast action-interpretation and player-expression requests, and owns per-request admission. | Tag the two supported NPC response purposes at the existing response call site; resolve the effective target and output settings before creating its meter/reservation. Preserve all other callers' selections. |
| `apps/server/src/macrofold-model.ts` | Produces OpenRouter reasoning and `provider.require_parameters` values. | Keep provider-specific defaults in the provider branch. A deployment request receives only its qualified input fields; do not pass these OpenRouter parameters through unchanged. |
| `apps/server/src/macrofold.ts` | `singleInference` hardcodes OpenRouter; retains journaled admission, accepted Run, original deadline, receipt recovery and native admission. | Consume the frozen target and shared request builder; retain the existing mutation/lifecycle owner. The native Worker/harness route is unchanged. |
| `packages/ai/src/macrofold-decision.ts` | Standalone generation and native decision clients share one executor whose binding is hardcoded to OpenRouter. | Extract the binding/request preparation responsibility, not another executor. Permit custom targets for generation, preserving the native decision model restriction and exact-Run recovery. |
| `packages/ai/src/types.ts` and existing receipt decoders | Model strings and managed/BYOK receipts identify current requests. | Carry the resolved custom target, immutable execution provenance and explicit allocation accounting basis separately from a provider model alias. Keep existing failure/uncertainty outcomes. |
| `apps/server/src/cognition-budget.ts`, `attempt-budget.ts` and durable accounting repositories | Admission holds and settlement protect existing call costs; world restore cannot rewind obligations. | Resolve the same target for allowance, dispatch and settlement. Recognize explicit request-only deployment charging, retaining unrelated holds and separate owner-funded allocation liabilities. |
| `scripts/decision-benchmark/{arms,execute,run,journal,recovery,evaluate}.ts` | Frozen finite arm set, source fingerprints, journals, original answers and no automatic paid replay. | Accept explicit custom-generation arms in a new selected experiment manifest; reuse dispatch, journaling and result handling. Do not mutate or regrade the historical seven-arm comparison. |
| Existing cognition diagnostics and private reports | Show permitted request/receipt/outcome information. | Show experiment/profile identity, effective purpose/target, capability refusal and known/unknown cost components. Keep raw private context in its existing restricted owner. |

Only the resolver and request construction need a small reusable module, such as `packages/ai/src/macrofold-inference-target.ts`; keep server-only profile policy under `apps/server`. A module name is an implementation suggestion, not another independently writable model registry. Public transport types remain in their current owning package.

## 3. Matching the shared Macrofold contract

The canonical [Macrofold deployment contract](https://github.com/Macrofold/Macrofold/blob/design/huggingface-model-deployments-2026-10-22/docs/projects/hugging-face-model-deployments-contract.md) owns wire schemas, permissions, errors and lifecycle guarantees. This section maps OpenLegend's use of that contract; it does not copy deployment-management schemas. Update the consumer and canonical examples together if a shared field changes during implementation.

### Target, preflight and permissions

The existing provider binding remains unchanged. Its alternative for a deployment contains **exactly** these three required UUID fields:

```json
{
  "deployment_id": "11111111-1111-4111-8111-111111111111",
  "deployment_revision_id": "22222222-2222-4222-8222-222222222222",
  "activation_id": "33333333-3333-4333-8333-333333333333"
}
```

The two binding shapes are mutually exclusive. Reject mixed `provider`, `model`, `billing_mode`, `provider_connection_id` or deployment fields; no provider string alias is a deployment ID. A revision pins source/artifact/runtime configuration; an activation pins the finite authorized spending session. Both are necessary: an unchanged model revision does not authorize silently using a new activation after an earlier one expires.

Preflight reads `GET /v1/model-deployments/{deployment_id}/activations/{activation_id}`. Validate returned revision/activation identity, source identity, `artifact_manifest_sha256`, qualified capabilities, readiness, expiry and cost policy against the requested target. Keep the returned qualification/provenance snapshot in operational evidence. A successful read is not inference admission and does not extend validity; Macrofold checks current authorization, budget and readiness again on submission. Cache only immutable capability/source facts within that explicit profile snapshot. Do not treat cached ready state as current admission permission.

Use the existing Macrofold API credential owner with `model-deployments:read` and `model-deployments:use`, restricted to the selected resources, plus the existing permissions needed to submit/read/cancel owned inference Runs. `model-deployments:write`, hosting/Hugging Face credentials and activation-management authority are absent from the game. Reads do not provision, wake or renew compute. No new credential goes in a save, browser, authored character, scenario input or benchmark report.

### Request construction

Submit through the same `POST /v1/inferences` path and existing `Idempotency-Key`/Run lifecycle. For strict structured generation, the body has this shape; exact input/limit validation remains the canonical contract:

```json
{
  "model_binding": {
    "deployment_id": "11111111-1111-4111-8111-111111111111",
    "deployment_revision_id": "22222222-2222-4222-8222-222222222222",
    "activation_id": "33333333-3333-4333-8333-333333333333"
  },
  "input": {
    "messages": [
      {"role": "system", "content": "Existing trusted service instructions"},
      {"role": "user", "content": "Existing permitted task and actor context"}
    ],
    "max_tokens": 256,
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": "example_response",
        "strict": true,
        "schema": {
          "type": "object",
          "properties": {"text": {"type": "string"}},
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
  }
}
```

The schema/text/limits above illustrate serialization only; the actual game uses the existing caller's complete schema and context, not this toy response. Omit `input.model`. Omit OpenRouter-only `provider.require_parameters` and `reasoning.effort`; never claim that a removed unsupported option was applied. The first profile supports only an explicit output-token reduction; other runtime/template/sampling choices are pinned in the qualified revision and recorded in the manifest. A later request-parameter extension must be accepted by the shared contract and capability validator before OpenLegend exposes it.

`input.max_tokens` and `limits.max_output_tokens` agree with the admitted output allowance. Preserve current positive per-call cost ceilings; the explicit zero request charge in a deployment receipt is a settlement fact, not permission to bypass positive configured admission or no-call controls. Effective time is the minimum of the current caller's original remaining deadline, Macrofold's current **240-second** direct-inference ceiling and the activation's remaining usable lifetime after its canonical cleanup margin. A permissive schema maximum of 300 seconds does not enlarge the deployed 240-second policy. If no usable interval remains, fail before dispatch. No new cold-start time allowance is added to gameplay.

For offline raw-text mode only, omit `response_format` and decode the completed text under the existing bounded transport. Record `output_mode: "text"` in the study manifest. It does not call the gameplay action decoder, cannot publish to a world and cannot be counted as JSON-schema or action success. Gameplay and structured benchmark mode require qualified `json_schema` support for the exact schema; neither generic JSON mode nor advertised tool calling is sufficient.

### Completion, provenance and costs

Retain existing immediate lifecycle: terminal output is `result.inference.value`; a 202 response means an already admitted Run to observe, not a queued new command or permission to submit again. The custom receipt includes `result.inference.deployment` with `deployment_id`, `deployment_revision_id`, `activation_id`, `artifact_manifest_sha256`, `runtime_image_digest` and `qualification_id`. Match every available pinned identity against the admitted snapshot before treating the value as experimental output. Mismatched/missing required identity is a contract failure; retain Run identity and financial obligations while withholding gameplay publication.

The custom inference receipt's `cost_attribution` is:

```json
{
  "basis": "deployment_activation",
  "activation_id": "33333333-3333-4333-8333-333333333333",
  "request_charge_micro_usd": "0",
  "infrastructure_cost_included": false
}
```

Existing `billing` remains the request-only charge. Copy provenance and cost basis into the extended `AiReceipt` without inventing a provider token price or representing the allocation as `managed`/`byok` token billing. The shared contract determines their exact nesting. Request settlement and allocation reconciliation are separate; missing hosting reconciliation is never inferred to be zero from this object.

### Error mapping

| Canonical code | HTTP | OpenLegend treatment |
| --- | --- | --- |
| `deployment_not_ready` | 409 | Unavailable for this task; no wake, wait queue or fresh deadline. |
| `deployment_binding_stale` | 409 | Frozen target invalid; require explicit new profile/cohort. |
| `deployment_expired` | 409 | Activation unavailable; require new operator authorization outside the request. |
| `unsupported_model_capability` | 422 | Preparation/capability failure; do not remove schema or change mode. |
| `deployment_capacity` | 429 | Bounded capacity outcome; record any retry hint without automatically retrying. |
| `deployment_budget_exhausted` | 402 | Stop new admissions under this activation; preserve other charges and unknown liabilities. |
| `deployment_unavailable` | 503 | Availability failure, with dispatch certainty determined by the canonical lifecycle evidence. |
| `permission_denied` | 403 | Authorization failure; no alternative credential or target. |

Map a validated canonical **pre-admission** rejection to no new inference dispatch only when the contract supplies that certainty. Do not classify every 409, 503, proxy error, parse failure or response loss as undispatched. Once a Run exists, retain and observe that exact Run and its dispatch state. An unknown submission retains uncertainty. Even a definitive no-dispatch response proves nothing about ongoing startup/idle/storage charges on an activation that already exists. Do not trigger paid fallback, replay or reconsideration from deployment lifecycle errors.

## 4. Purpose-specific profile and route resolution

An experiment profile is trusted application configuration, immutable for the process and captured by each request. It is neither a world definition nor character-authored data. Use the existing startup configuration pattern; accept one optional `OPENLEGEND_MODEL_EXPERIMENT_JSON` document. Standalone tooling loads the same deployment-target schema from an explicit private manifest/file. Missing configuration retains the current ordinary routes. Invalid supplied configuration fails startup/preparation instead of pretending that the experiment ran.

The profile declares a human-readable experiment ID, exact target bindings for a closed set of supported purposes, an optional explicit output-token reduction and the comparison scope. The first supported gameplay purposes are `npc_response_fast` and `npc_response_complex`; standalone `benchmark_generation` is a tool-purpose value, not an automatic gameplay route. Reject arbitrary purpose strings and unrecognized properties. Include only bindings that the operator deliberately overrides. An omitted purpose uses its existing configured route and is reported as such; an invalid present purpose never falls back.

The initial strict profile schema is:

| Field | Type and required validation |
| --- | --- |
| `schema_version` | Required integer literal `1`; unknown versions fail preparation. |
| `experiment_id` | Required string, 1–64 ASCII letters/digits/dot/underscore/hyphen, beginning with a letter or digit. Display identifier only; never a file path or authorization token. |
| `comparison_scope` | Required `single_model` or `system`. A single-model profile requires existing decision-escalation configuration to be off. A system profile records the exact existing escalation and other co-model settings; it does not enable them itself. |
| `purposes` | Required object with at least one and at most two keys from `npc_response_fast`, `npc_response_complex`. No other keys. |
| `purposes.<purpose>.model_binding` | Required exact three-UUID deployment binding above. |
| `purposes.<purpose>.max_output_tokens` | Optional positive integer no greater than the existing selected role's output allowance and qualified deployment maximum. Absence preserves that role's existing allowance; an incompatible preserved allowance fails preparation. |

Every object rejects unknown properties. There is no in-profile endpoint URL, credential, launch flag, fallback model, retry count, unbounded prompt, injected system instruction or output-schema override. Source/revision/runtime settings stay in Macrofold. The startup parser computes a SHA-256 over the canonical UTF-8 JSON profile and retains the exact parsed profile with that digest; key order/whitespace do not create a new identity. Canonical JSON uses the same deterministic serialization selected by the shared request fingerprint owner; do not invent an incompatible ad-hoc concatenation.

```json
{
  "schema_version": 1,
  "experiment_id": "low-refusal-pilot-2026-10",
  "comparison_scope": "single_model",
  "purposes": {
    "npc_response_fast": {
      "model_binding": {
        "deployment_id": "11111111-1111-4111-8111-111111111111",
        "deployment_revision_id": "22222222-2222-4222-8222-222222222222",
        "activation_id": "33333333-3333-4333-8333-333333333333"
      },
      "max_output_tokens": 2048
    }
  }
}
```

The example leaves complex NPC response and all other producers on their ordinary route. Single-model means the selected response intervention has no hidden recovery generator; level-1 judgment, embeddings and unchanged maintenance are still disclosed co-models, so the report must not imply every component is the candidate. Standalone tooling reuses the deployment-target schema but supplies `benchmark_generation` through its own manifest, not the gameplay `purposes` object. It requires explicit `output_mode: "json_schema" | "text"`; the latter is offline-only as specified above.

Do not infer the purpose from `GenerateRequest.execution`: `fast` also serves action interpretation, player expression and consolidation. Do not infer it from model-string equality: two distinct consumers may intentionally share the same baseline model. The existing NPC response producer supplies the trusted purpose explicitly; callers outside the selected purposes cannot use the experiment profile accidentally.

Resolve one immutable effective request record before `generationAllowance`, the director's meter and paid attempt reservation. It binds purpose, profile digest, exact model target, requested/effective generation settings, output allowance, admitted price/accounting basis and the locally captured response-schema digest. The same record supplies request serialization, receipt continuity and private diagnostics. Never look up a mutable “current profile” again after dispatch to reinterpret an earlier attempt.

Generation settings have three owners: trusted caller selects the task/strict schema and current role envelope; profile selects an explicitly permitted model/configuration; Macrofold's immutable revision describes actual capabilities/runtime limits. Validate their intersection before sending. A caller cannot enlarge its current role limit by selecting a deployment with a larger maximum. An explicit smaller experiment output limit is a reported intervention; an unsupported setting is not silently omitted. Existing defaults for reasoning apply only to their original provider branch. Model-specific reasoning mode belongs to the pinned qualified runtime configuration unless the shared protocol explicitly exposes a supported request field.

`AI_JEV_ONLY`, fixture mode, missing model-use authority and the current zero-budget/no-dispatch mode remain controlling. A pre-funded GPU is not permission to make hidden external calls during a native check. Selecting a profile never grants provider credentials or additional budget.

## 5. Preparation, context and response ownership

Use the same installed production context builder and exact response schema in baseline and candidate comparisons. Required complete About me, source-linked own outcomes, current work and permitted reference mappings stay intact. Keep service instructions and actor content separate. An experiment does not add a special accommodating NPC prompt or remove alternatives to improve a selected candidate's score.

Record the complete finalized request: instructions, context, references, response schema, wrapper, selected output allowance and actual pinned sampling/reasoning settings. Schema bytes and outer transport bytes are different measurements. A local byte-to-token heuristic is not a qualified tokenizer proof. Macrofold enforces the selected runtime's actual effective context limit; OpenLegend preserves its existing byte/structure limits and supplies the unchanged complete request. If exact local tokenization is supplied and qualified by the deployment owner, record its identity/basis; do not add an automatic paid token-counting round.

When the required context cannot fit, return `context-exceeded`/the mapped capability outcome and count it as coverage failure. Existing context-selection semantics may omit genuinely optional evidence under their normal contract, but all comparison arms receive the same admitted semantic task unless context strategy itself is the declared intervention. Do not shorten a difficult input only for the experimental model or silently discard schema/reference information.

Use one frozen local validator prepared before dispatch. Strict remote schema enforcement is capability evidence, not authority or a substitute for local validation. Check the whole completed value, resolve only request-owned references, and submit proposals to the existing current-state admission owner. Distinguish malformed/incomplete model output, legitimate semantic abstention, current native rejection and actually committed effects.

The first gameplay delivery is completed output. Do not attach private transport deltas to a public speech path simply because the runtime supports SSE. Existing stream parsing may collect private latency evidence when explicitly enabled; no partial private field, incomplete JSON, reasoning or unscreened passage becomes speech. A later NST-qualified model consumes NST's sole installed record contract and existing publication owner; this project does not introduce a parallel `talk` stream or require NST delivery first.

## 6. Request lifecycle, cancellation and reconfiguration

1. Read and freeze the trusted profile once at startup/tool preparation. Obtain the exact authorized deployment descriptor during bounded preflight, not on every simulation tick or every token.
2. At the producer, determine the explicit purpose and resolve its immutable target. Construct the ordinary permitted context/schema and validate local limits, configured settings, source/authority fences and existing aggregate call budget.
3. Record the target/profile fingerprint with the existing attempt/request journal before dispatch. Retain the exact prepared HTTP body and original deadline.
4. Submit once through the ordinary Macrofold mutation transport. Await accepted Run persistence before accepting any progress or completed output. A response loss without a Run remains dispatch-uncertain; it does not authorize resubmission.
5. Observe the same accepted Run using the current terminal/result/recovery owner. Reading or cancelling that Run is distinct from launching another inference. Original deadline includes admission, body reading, accepted callback, observation and result publication; cleanup retains its separately bounded existing budget.
6. Decode the exact custom identity/accounting receipt independently from value usability. A completed invalid or withheld answer can still carry a real request charge. An unpriced or possibly running request retains its financial/execution uncertainty.
7. Recheck current actor/world/timeline/authority and native prerequisites before applying any proposal. Record each actually committed operation through its existing owner. Failure does not roll back earlier separately committed costs or effects.

A suspended/expired/not-ready deployment never causes OpenLegend to provision or activate capacity. The operator prepares readiness before a live study. Capacity exhaustion or a deliberate model stop returns a bounded failure; no implicit queue, hidden warmup allowance, model substitution or renewed deadline is introduced in the game.

For first delivery, profile changes take effect on a controlled process restart. End optional gameplay publication and reconcile accepted/uncertain calls through the existing shutdown/restart rules. There is no hot reload, per-utterance endpoint switch or mutable alias. A new profile/revision creates a new experiment cohort and cannot reinterpret historical invoices, references or answers. Revocation is enforced at Macrofold admission even when the local immutable metadata snapshot is cached.

Gameplay saves exclude credentials, deployment configuration and active remote model handles as reusable authority. Existing durable operational attempt identities and financial records remain outside rewindable state. Restore fences old requests by timeline/generation, retains accepted character history and rebuilds only current derived preparation; it never downloads a checkpoint, renews a lease or regenerates old dialogue.

## 7. Financial admission and whole-cost reporting

Macrofold's contract must explicitly distinguish per-request billing from an operator-funded model allocation. Do not assign an invented zero token rate to a self-hosted model or treat absent token usage as proof that compute was free.

Gameplay retains its existing positive finite per-call reservation ceiling and actor/task admission. The deployment request-only charge can settle to explicit zero only when a verified receipt binds that policy and the completed exact attempt; other obligations are unaffected. The deployment owner separately bounds startup, warm/idle duration, storage and uncertain shutdown. OpenLegend's per-agent monthly allowance and `MACROFOLD_RUN_MAX_USD` do not cap those shared costs, just as they do not cap an existing Worker allocation.

For controlled experiments, one study coordinator holds the deployment activation's entire approved commitment plus every token-provider reservation, known charge and unresolved prior attempt against the same authorized task ceiling. Workers/delegates/extra output directories do not create fresh budgets. Count the allocation once across its concurrent requests. A strict study cannot use a deployment whose total potential obligation lacks a credible bound; the operator must select a bounded activation or use a suitable already funded allocation with explicit attribution/authorization.

The final report has separate values for request charges, deployment allocation charges, other inference/preparation/screening charges, external-provider estimates, outstanding/uncertain commitments and remaining authorization. Measured hardware seconds/utilization and token counts are usage, not interchangeable invoices. Whole-experiment cost is the sum of non-overlapping financial obligations; per-episode allocation is labeled an analytical allocation, never an upstream per-request bill. Missing final hosting reconciliation keeps the study's financial gate open.

## 8. Experiment manifest and report

The frozen experiment manifest is the experiment's input contract. Store it and private raw results outside the Git repository under the existing benchmark permissions and retention rules; commit authored fixtures, concise interpreted findings and source links only. Reuse existing journals and append ownership rather than invent another transaction log.

| Manifest section | Required contents |
| --- | --- |
| Identity and scope | Experiment ID, preparation timestamp, exact OpenLegend revision and patch fingerprint, supported workload, cohort/split identity and comparison question. |
| Targets | Exact baseline binding, custom deployment revision and activation reference, returned source/runtime/template/tokenizer/quantization/hardware provenance, capability evidence identity, and explicitly unknown hosted provenance. |
| Application | Explicit purpose, installed cognition/context/response compiler identities, trusted service-policy version, context/reference digests, output limits, allowed parameters, ordinary co-models and escalation mode. |
| Cases and references | Frozen original-character family/episode IDs, permitted inputs, split assignment, expected defensible alternatives, known objective constraints, review rubric and severity; references never enter model input. |
| Work plan | Ordered exact case/arm/replicate combinations, seed when supported, counterbalanced request order, cold/warm/concurrency condition, selected request count and stop conditions. |
| Money and authority | One authorized task cap, prior known charges/holds, per-call bounds, bounded allocation commitment, exact account/organization/resource use authorization references without credentials, and data-use/terms prerequisite status. |
| Recovery | Output/journal path and lock identity, previous cohort linkage if explicit continuation, exact original request/Run identities and unchanged request fingerprints. |

Historical `benchmarkArms` remain frozen. Extend the reusable arm resolution mechanism with strict manifest-supplied custom-generation arms; do not append arbitrary Hugging Face strings to the native decision union. For generative scoring of supplied questions, reuse the current structured decision compiler and decoder and label its numbers as generated estimates. Do not call them native calibrated probabilities or add implicit temperature/normalization repair.

Dry preparation validates the manifest and local corpus without inference. A separately explicit live invocation may perform capability probes and selected cases under the same budget. Running a manifest is not permission to deploy or enlarge compute. Preparation records exactly which external metadata reads are needed; provider model calls remain visibly separate.

Every selected combination ends as unattempted, definitive admission failure, accepted pending/uncertain, usable completed output, explicit refusal, malformed/incomplete output, or a completed model proposal with its native/subjective assessment. Keep independently known costs even when output is unusable. Recovery observes an accepted Run; it never erases the first attempt or quietly submits the next generation.

Reports retain selected/attempted/completed/answered counts, all failure categories and evidence gaps. Show quality over usable answers alongside complete-workload coverage and a separate common-answered diagnostic. Group related variants in the same split and resample at episode/family level. Count first useful admitted action/text and final completion separately; a quickly rejected response is not a useful-latency win.

## 9. Frozen comparison matrix and review

Use supported current game operations for executable episodes. Hypothetical authored worlds may be used offline but must be labeled and cannot establish a current gameplay capability. Each family varies original character dispositions and relevant evidence without writing the expected action into biography.

| Family | Minimum contrasting inputs | Objective and reviewable expectations |
| --- | --- | --- |
| Permitted fictional conflict | Hostile, cautious and protective people encounter the same clearly fictional threat. | Retain exact allowed actions/evidence; distinguish coherent retreat, hostility and independent refusal from generic assistant refusal. Preserve separate existing CTR ordinary-baseline acceptance where applicable. |
| Independent disagreement | A principled and an opportunistic person face repeated player pressure. | Choices follow permitted motives/evidence; compliance alone is not success. Do not mistake disagreement for censorship. |
| Warmth without agreement | Friendly character receives a false claim or an unwelcome request. | Kind tone can coexist with factual restraint and personal boundaries; no compulsory advice or flattering assent. |
| Testimony and deception | One observer witnessed an event; another only heard an attributed claim; an intentional lie is separately authored as such. | Preserve belief versus fact, identity and audience. Do not infer deceptive intent after an error to excuse it. |
| Own action truth | A chosen action succeeds, fails, is interrupted, or remains in progress in otherwise matched episodes. | Subsequent statements reflect the supplied actual outcome; generated intention is not completion. |
| Private and missing evidence | Two observers have different permitted histories; a reference becomes stale or inaccessible. | No disclosure of unprovided/private facts, no guessed target binding and no inference of absence from missing data. |
| Quiet and mature expression | A brief/silent resident and an expressive adult character face permitted non-graphic themes. | Silence or short text can succeed. Count unnecessary sanitization separately from appropriate product withholding. |
| Longitudinal identity | Return after intervening events, corrected evidence and a fresh model session. | Preserve required identity and relevant recall, allow justified change, record time/exposure to first unexplained drift. |
| Boundary and instruction pressure | Quoted/player/imported text asks for rule, permission or funding changes. | Text remains data. No extra provider call, secret disclosure, unsupported action or policy change occurs. |
| Useful player activity | An ordinary supported cooperation, rivalry, discovery or quiet-company encounter. | Record meaningful choices, actual consequences, wording effort and repeat value; completion or extra prose alone does not establish enjoyment. |

Classify outcomes on separate axes: model assistant refusal; quiet sanitization; independent character choice; uncertainty; provider block; service withholding; invalid schema; engine rejection; committed action; unknown/ambiguous. Neither HTTP status nor refusal keywords alone settle the subjective classes. Two blinded reviewers independently assess consequential character/refusal comparisons using the same permitted context; retain disagreements and an adjudication note. Automated judges may annotate, but cannot replace the native invariants or assume more polite/longer output is better.

Before calls, each selected study supplies exact episode/case/replicate counts, accepted alternatives, practical latency/cost ceilings and a declared minimum improvement criterion for its question. The implementation validates their presence and does not invent a universal model-quality cutoff. A small screening report may recommend a longer study; it must not claim production adoption. Severe privacy/authority/service-boundary failures remain individual stop/review events, not tradeable writing-score penalties.

## 10. Growth, performance and storage

Preparation adds one bounded profile lookup and retained target record per applicable generation. Read immutable deployment metadata once per explicit preflight/profile revision; use no model discovery or host-status polling in the simulation loop. Current application source selection, context bytes, request deadlines and output bounds remain effective. Macrofold rechecks dynamic use permission/capacity at actual admission.

The study's cost grows with selected cases × arms × explicit replicates and episode turns, plus independent co-model work and allocation wall time. Before constructing payloads, expand only the finite selected work plan and reject a plan exceeding its explicit request/byte/time/budget allowance. Limit retained raw response bytes with the existing transport; stream journal/report processing where supported rather than accumulate all bodies in memory. Journals grow with explicitly selected work; the manifest fixes its finite extent. No process repeatedly rescans every historical result for admission.

A full study report legitimately reads its selected cohort once. Reuse existing append-updated accounting aggregates and exact-Run receipts. Host utilization and provider timing remain separate from OpenLegend total latency; no isolated warm request supports a town-capacity claim. Cold start, idle shutdown, simultaneous requests, provider backpressure and actual native progress are separate qualification conditions.

## 11. Implementation and verification acceptance

The focused tracker owns stage completion. Demonstrate matching request/receipt fixtures against Macrofold's canonical examples; actual purpose isolation; no dispatch on invalid binding/schema/permissions; correct original-Run recovery after acceptance loss; once-only settlement; zero-budget no-call behavior; preserved unknown allocation expense; stale/restore fencing; and profile-change isolation. Inspect and use existing focused checks or a small ad-hoc scenario; no new automated tests are authorized solely by this design.

After zero-paid verification, run separately authorized minimal live probes for the exact artifact/runtime and both a successful schema output and a meaningful failure. Record actual completion/tokenization/identity/cancellation/cost evidence. Then conduct the finite selected private screen and a disposable-world ordinary response/failed-action/return episode. These are distinct evidence classes; no fixture can close live quality, host cost or external-player release gates.

No new model selection, public deployment or release certification follows from a passing transport probe. Keep broader CE/CR/AG, PD07/PD10, NST and PF/PS acceptance with their owners. The design's completion requires no GPU launch or live model execution.

## 12. Decisions and evidence still required

The interface/ownership/lifecycle and selected purpose coverage are design decisions. Actual artifact accessibility, runtime capability, GPU availability, model quality, cost and responsiveness are experiment evidence to collect under an explicit finite run configuration. They are not defaults the implementation agent should guess or reasons to add a second fallback path.

No unresolved product choice blocks implementation of this scoped design. Expanding to native scoring, full tool harness, multimodal output, player-local serving, public progressive speech or training follows its existing owner and exact capability/release criteria; it is not silently included because a Hugging Face page advertises the feature.

## Maintained records

- Implementation: [MX — model experiments](../maintainers/model-experiments.md).
- Feature counterpart: [Behavior and journeys](model-experiments-feature-spec.md).
- Limits: [Model experiments](../limits/model-experiments.md), [AI execution](../limits/ai-execution.md) and [cognition](../limits/cognition.md).
- Existing contracts: [AI providers](../ai-providers.md), [situation-aware context](situation-aware-cognition-context-tech-design.md), [save/load](../save-and-load.md#continuation-and-identity), [identity](../identity-and-references.md), [content policy](../agent-content-and-companion-safety.md).
- Evaluation policy: [Existing benchmark fairness](../../scripts/decision-benchmark/README.md#grading-and-fairness), [NPC evaluation research](../../archive/02-research/npc-cognition/11-evaluation-and-research-gates.md).
