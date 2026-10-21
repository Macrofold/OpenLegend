# Situation-aware cognition context: evidence and decisions

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | The supplied-request audit and conversation decisions are recorded. Runtime implementation, provider qualification and measured gameplay/cost outcomes remain open. | 2026-10-19 |

## 1. Purpose and evidence boundaries

This is the durable evidence companion to the [feature specification](situation-aware-cognition-context-feature-spec.md) and [technical design](situation-aware-cognition-context-tech-design.md). It records what Mike asked, what the supplied GPT-5 request actually contains, which earlier explanations were verified or qualified, and why the selected design preserves informed, interesting character choices. Implementation work and acceptance status belong to [the cognition-context maintainer record](../maintainers/cognition-context.md); quantitative constraints belong to [the cognition limits inventory](../limits/cognition.md). This document is neither a second backlog nor evidence that the proposed runtime behavior exists.

Three baselines must remain distinct:

1. **Supplied artifact:** Mike's `Pasted text(1).txt`, a JSON request export. It identifies `openai/gpt-5`, low reasoning effort and an output allowance of 4,096. Its origin/deployment revision and exact relationship to bytes accepted by a provider are not established by the file alone.
2. **Inspected source:** `Macrofold/OpenLegend`, `main` at commit `0b1262a597ca718be54c287eea0619b073952f32`. The source findings below describe that revision. They do not assert that it generated the supplied export or that the selected design has been implemented.
3. **Selected target:** the paired feature/technical documents on `design/situation-aware-cognition-context`. They specify coordinated changes to existing owners. Completion of design work does not close implementation, independent model behavior, performance or human playtest gates.

The artifact's SHA-256 is `f2b3f680758769648f0cac001b625bf1e547123f98fc57cc79b0964972c9a74b`. The measurements below were recomputed from it without a model call. The design work made **no paid OpenLegend/Jev/provider calls; additional Jev cost was $0**. No token receipt, cache receipt, matched model comparison, latency benchmark or human playtest was produced by this audit. The attachment's configured price ceilings are request settings, not a bill or a verified current provider tariff.

## 2. Why the supplied request is so large

### 2.1 Exact measurement method

The attachment is valid outer JSON. Character counts below count Unicode code points; byte counts use UTF-8. The file has 1,620 newline characters and therefore 1,621 displayed lines, with no trailing newline. Compact JSON means parsing that JSON and serializing it without indentation or separator spaces, preserving Unicode rather than converting it to ASCII escapes. This measures a local representation, not the provider's hidden rendered prompt or tokenizer.

Decoded message content and serialized JSON have different lengths: newlines, quotes and backslashes inside a message require escaping in JSON. Consequently, decoded section lengths must not be added directly to serialized schema lengths and advertised as an exact transport saving. Section counts include their heading and separators through the next `##` heading. The final References interval includes two appended blocks, separated below.

| Measured object | Characters | UTF-8 bytes or line count | Interpretation |
| --- | ---: | --- | --- |
| Supplied formatted file | 144,203 | 144,225 bytes; 1,621 lines | The large visual line count is dominated by JSON formatting and expanded schema structure. |
| Entire compact JSON request | 47,998 | 48,020 bytes | The same local JSON value without presentation whitespace. This is not a measured provider input-token count. |
| Decoded system message | 1,534 | One message | Shared character/operation instructions plus the invention-disabled instruction. |
| Decoded character context message | 30,663 | 122 logical lines | Identity, current situation, evidence, activities, actions, response prose and references. |
| Serialized `response_format` value | 13,340 | 1,595 lines in the original formatted span | Includes the format wrapper, schema name and strictness setting. |
| Inner response JSON Schema | 13,260 | Compact schema only | The baseline for the schema-shape illustrations in section 4. |

The exported controls also include `provider.require_parameters: true`, `allow_fallbacks: false`, and `max_price` values of `prompt: 1.25`, `completion: 10`, `request: 0`. They are retained here as artifact facts, without inferring paid cost, eligibility or unchanged pricing. `max_tokens: 4096` concerns the output allowance; lowering it does not remove the supplied input context.

### 2.2 Complete decoded context breakdown

These intervals sum to the 30,663-character context message. A large interval may contain both necessary information and removable duplication; its size alone is not a deletion criterion.

| Context heading | Characters | What the audit establishes |
| --- | ---: | --- |
| Me | 1,555 | Accepted personal history, identity, body state and gesture guidance are combined in one rendered section. Preserve the accepted person; separate mutable facts through their owners. |
| My commitments | 214 | No commitments are supplied, followed by learned-activity coverage guidance. The empty state and the coverage statement have different meanings. |
| Trigger | 468 | The character's arrival at Broken Watchpost is the initiating observed event. |
| Trigger facts | 497 | Event time/age, occurrence source and current visibility, plus general social-role guidance. |
| Task | 288 | Optional choices and in-character response guidance, partly repeated elsewhere. |
| Conversation so far | 246 | No experienced exchange is supplied, followed by general conversational guidance. |
| Known planning techniques | 809 | Four known technique/action handles with costs, prerequisites and uncertainty. |
| Private intentions and native work | 759 | Existing supply goal, no remaining chosen work, plan revision and goal-control data. |
| Native navigation | 7,053 | Navigation grammar, a full installed-activity descriptor array, current position/support and public supports. |
| Current time | 71 | Current named time and simulation time. |
| Optional installed activity requests | 5,512 | The same descriptor array again, plus permitted choices, warnings and semantic guidance. |
| Recent memories | 659 | Arrival evidence also used as the trigger, plus seeing Orin. Shared evidence can be rendered once while retaining both roles. |
| Nearby actors and objects | 891 | Six perceived people, animals, resources or objects with useful observations and geometry. |
| Inventory | 481 | Knife, two cooked meat and equipped shield with meaningful properties. This section does not supply their ID tokens. |
| General knowledge notepad | 122 | An empty notepad envelope with revision and size metadata. Empty content does not remove note creation. |
| Knowledge | 108 | A known shield-making method. |
| Actions | 2,600 | Twelve suggestions, including inspection, pickup, movement, gathering and quiet continuation; unlisted attempts remain possible. |
| Response format | 5,593 | A second prose specification of fields, examples, limits and operation meaning. Some structural claims have drifted from the schema. |
| References and appended blocks | 2,737 | The actual References block is 2,258; an empty private-invention-results line adds 31 and feeling-proposal context adds 448. Do not attribute the entire interval to reference mappings. |

The useful diagnosis is a mixture of **duplicate representations**, **a broadly expanded contract**, **UI-oriented metadata**, **unconditional detail**, and **necessary current evidence**. Merely removing indentation improves the debug view and reduces local transport whitespace; it does not establish the same saving in provider processing. The selected design removes duplicated meaning, prepares a smaller appropriate contract and selects situation-relevant facts before expensive hydration/formatting.

### 2.3 The duplicated activity catalogue is not the entire second section

The exact same compact 4,014-character descriptor array appears twice: after `Optional installed activity requests:` inside Native navigation, and as `activityRequests.requests` inside the later section. It defines four installed requests: `base:camp-supply-method`, `base:fire-watch`, `base:combat-help` and `base:outing-invite`.

The later JSON object is 5,307 characters because it additionally carries `choices` (1,255 characters; nine entries) and `warnings` (`[]`). Those choices associate permitted objects or material definitions with actual request roles, and sometimes provide distance/access evidence. Removing the duplicate descriptor array must preserve the useful choice information. An empty warnings array can be omitted when its absence has an explicit equivalent meaning; failure or partial preparation must not be rendered as empty successful coverage.

Deleting `presentation`, `submitLabel` and `purposeLabel` keys recursively from **one** descriptor array reduces its local compact length from 4,014 to 3,412, a 602-character difference. This is the narrow calculation discussed in the conversation. It does not show that every field named `label`, `description`, `modeLabels`, `requires` or `discovery` is unnecessary. For example, a label distinguishing a held reserve from an exact transfer quantity, or a mode description explaining interruption, contains decision-relevant meaning. The AI projection preserves that meaning in one concise form even when the human form also uses it.

### 2.4 What this particular situation must still communicate

The artifact concerns **Kest arriving at Broken Watchpost**, with an existing intention to keep supplies available for Kest and Orin. Kest is idle; the prompt says there is no remaining chosen work and no experienced conversational exchange. The arrival event is about 187 simulation seconds old in the supplied trigger facts. These are audit facts, not a newly authored scenario or evidence that Kest has finished provisioning.

The context supplies Kest's accepted personal history, current conditions, equipped knife/shield, accessible food, known methods, visible cache contents and resource opportunities, Orin, animals including a visible wolf, and uncertainties such as unknown route length. This supports several informed possibilities. A scene-aware compiler must not conclude that a quiet arrival makes possessions, spatial constraints or a possible threat irrelevant; nor should the mere presence of a wolf force combat. It needs the relevant permitted evidence and meaningful alternatives, allowing the character to decide.

Some activity details may be irrelevant or unavailable in this captured scene, but that cannot be decided from an activity name alone. The actual request prerequisites, perceived opportunities, current goal/work and actor knowledge govern selection. A missing currently offered fire target can justify omitting detailed fire-watch parameters when no current decision depends on them; it does not establish that no fire exists anywhere or permanently remove the concept of tending a fire.

No expected reply is supplied as part of the proposed context. The same person could inspect, gather, organize, eat, speak, decline an offered activity or continue quietly when supported by the actual situation. Comparisons that demonstrate relief after provisioning must create and retain a real completed-work outcome; they cannot reinterpret this arrival export as that later state.

## 3. Clarifications settled in the conversation

### 3.1 A character can speak and act at the same time

**Yes.** The constraint concerns one payload per operation, not one operation per response. A response contains an `operations` array. It may include speech and an action as separate entries, repeated operation kinds, or no changes. The current system instructions explicitly preserve ongoing work through speech and thought; the current response/domain contracts admit a sequence of independent operations. See the pinned [cognition contracts](https://github.com/Macrofold/OpenLegend/blob/0b1262a597ca718be54c287eea0619b073952f32/apps/server/src/cognition-contracts.ts) and [domain response owner](https://github.com/Macrofold/OpenLegend/blob/0b1262a597ca718be54c287eea0619b073952f32/packages/domain/src/response.ts).

Native capability checks still decide physical compatibility and whether a particular action replaces, queues behind or interrupts work. An admitted walk need not finish before compatible speech is spoken. `requiresAccepted` depends on earlier operation admission, not physical completion. Plan-step continuation has its separate physical completion and prerequisite semantics. The compact design retains all these distinctions, including truthful partial receipts when one operation succeeds and another fails.

The selected sparse form therefore retains an array of operations with one active payload in each entry. It does not merge talk and act into an ambiguous object, serialize all physical behavior behind speech, force an unnecessary thought/goal, or reduce the array to a single entry. The technical design's same-reply examples are documentation and qualification inputs, not examples pasted into every character request.

### 3.2 Why there is both a Response format section and a JSON Schema

The current formatter has a separately maintained prose manual as well as the provider's machine-readable schema. Part of that manual explains game semantics that JSON shape alone does not convey: an intention is not completion, replacing work has consequences, a request is not a learned method, and perceived speech has a particular recipient. That meaning is useful. The duplicated field lists, null-padding directions, numeric limits already present in schema, and full JSON examples are much less useful and can drift.

The export demonstrates actual drift: the prose lists seven kinds and six unused null fields, while its schema has eight kinds including `appraise` and seven inactive payloads per alternative. Its speech example omits `appraise`. Its plan prose lists `enqueue|replace|cancel`, while the current schema also permits `interrupt`. These same hand-maintained passages remain in the pinned [response formatter](https://github.com/Macrofold/OpenLegend/blob/0b1262a597ca718be54c287eea0619b073952f32/apps/server/src/response-context.ts); this is not solely a hypothetical maintenance risk.

The decision is to give **structure one authoritative schema owner** and retain brief semantic instructions once, selecting detailed explanations when their capability or target matters. All enabled broad operation meanings remain discoverable. Removing the prose manual does not mean the character receives only opaque JSON field names with no explanation of consequences.

### 3.3 UI labels do not mean References

Mike's correction is adopted explicitly: **the name/description-to-ID mapping is necessary**. `presentation`, button captions and redundant form decoration are different from knowing which exact token represents Orin, a knife or a particular cache item. An enum of fifteen opaque tokens constrains syntax but does not communicate that mapping.

The artifact makes the distinction concrete: the inventory names the knife, cooked meat and shield without their tokens, and the nearby cache description names its five item stacks without their tokens. The References block supplies those eight item mappings. Deleting that section now would leave otherwise useful named choices insufficiently bound. Several perceived actors/objects already have inline tokens, so there is a possible later consolidation, after verifying complete coverage.

The target initially retains References. Later an exact mapping may be rendered once beside its primary description if a mechanical check proves all needed labels, roles, namespace distinctions and request-owned bindings survive. This must work for duplicate names, unnamed but recognized people, observer-specific aliases, possessions and inspected contents. Recognition does not reveal an unknown true name, current location or private history; a remembered knowledge reference does not identify a currently visible body. See [identity and references](../identity-and-references.md) and [the technical design's reference rules](situation-aware-cognition-context-tech-design.md#73-exact-name-to-id-mappings-remain).

## 4. Schema alternatives and the null anomaly

### 4.1 Repeated structure in the supplied schema

There are eight alternatives under `operations.items.anyOf`: appraisal, speech, action, thought, goal, plan, knowledge note and given name. Every alternative declares `localId`, `requiresAccepted` and all eight payload fields; exactly one payload is active. Across the alternatives there are **56 inactive payload declarations** and corresponding repeated `required` names. The same 15-token entity enum appears **12 times**. Action and planning handles are also repeated where they are independently referenced.

Strict schema requirements do not require declaring unrelated payloads in each alternative. Each alternative can declare and require only its own fields while the root remains an object containing the operation array. The selected first implementation uses that sparse nested `anyOf` shape, preserves exact current reference/action constraints and updates local/domain parsing at the same time. Changing the provider schema alone would fail current local envelope checks that still require the padded shape. This is a coordinated contract change, not a serializer-only patch.

| Local shape illustration | Compact inner-schema characters | What the number establishes |
| --- | ---: | --- |
| Supplied schema | 13,260 | Artifact baseline, retaining its exported null anomaly. |
| Remove seven inactive payload fields and their required-list entries from each alternative | 11,636 | Independently reproduced reduction of 1,624 characters, about 12.2%, before other refactoring. |
| Earlier conversation illustration: sparse alternatives plus shared definitions/references | 9,919 | The previously discussed illustrative calculation, about 25.2% below 13,260. The exact extraction/naming transformation was not retained with this artifact audit, so this is not a reproducible acceptance baseline or a promised final size. |

The sparse transformation above changes no action/goal/plan payload fields and removes no operation kind. It also leaves other genuine repetition for the owning design to assess. Dollar, token and latency savings cannot be inferred directly from these character differences.

### 4.2 Why `$defs`/`$ref` is a later gated refinement

OpenAI documents support for definitions/references in its supported Structured Outputs subset, but the repository's [local `compileSchema`](https://github.com/Macrofold/OpenLegend/blob/0b1262a597ca718be54c287eea0619b073952f32/packages/ai/src/validation.ts) explicitly rejects `$ref`, `$dynamicRef`, `$recursiveRef`, `$id` and `$async`. Provider support therefore does not make a referenced schema usable here. The initial sparse implementation requires no reference-loader change.

If measurements after sparsity justify deduplicating retained schema definitions, the technical design gates local, nonrecursive references within one frozen schema, with bounded validation and every actual provider/preview consumer qualified. It does not authorize external schema loading or arbitrary recursive graphs. This preserves the value of the earlier shared-definition idea without claiming it is a drop-in first step.

The **later server-bound revision/work-mode stage is selected implementation, not this conditional `$ref` gate**. After sparse-contract qualification, SC12 removes expected-revision echoes from model fields and derives them from the captured read set. Same-reply dependent writes use the last accepted writer's actual result only through an explicit dependency; independent stale writes still refuse. An installed request's work mode is derived once only when its definition declares the same transition meaning. [Technical design section 10](situation-aware-cognition-context-tech-design.md#10-later-refinement-server-bound-revisions-and-one-work-mode) specifies the complete binding rules. Decision appraisals already derive expected revisions from prepared feelings in [`bindDecisionAppraisals(...).resolveDecision`](https://github.com/Macrofold/OpenLegend/blob/0b1262a597ca718be54c287eea0619b073952f32/apps/server/src/appraisal-context.ts); native resolution still checks the current record. That precedent does not make the broader goal/plan/note/name change delivered.

The source also independently chooses the installed `invocation.family` enum and the union of its possible parameter objects. The provider schema can therefore admit a mismatched family/parameter combination even though native admission subsequently rejects it. The selected action/invocation design pairs each family with its exact permitted shape. It retains typed quantities, role-specific IDs, deadlines, qualifiers and work-transition meanings; a shorter request must not weaken the request's actual meaning.

### 4.3 Exported `type: null` needs evidence, not a production diagnosis

The supplied inner schema contains **91** declarations written as `"type": null`, including the 56 inactive payload declarations and 35 remaining declarations. A JSON Schema null type is written as `"type": "null"`. The outer request remains parseable JSON, but those exported schema declarations are anomalous.

At the pinned revision, the schema owner uses `z.null()`, the director calls `z.toJSONSchema(..., { target: 'draft-7' })`, and the AI client captures/validates the schema before dispatch. The inspected canonical serializer preserves strings; it does not contain a conversion from the string `"null"` to JSON null. This source evidence does **not** identify which export, rendering, deployed build or provider boundary produced the attachment. No live schema submission was performed to settle it.

The implementation owner must compare the exact prepared schema, local captured request and provider-bound representation for the same admitted attempt, retaining the normal privacy/accounting rules. A verified serializer/export issue and a verified actual submitted-schema issue have different owners and consequences. Do not work around a suspected export problem by weakening validation, changing model/provider or paying for repair calls.

For transparent comparison, the 13,260 and 11,636 figures retain the artifact's anomaly. Changing only these `type` values to the valid string representation produces 13,442 and 11,706 characters respectively. These are additional local calculations, **not** proof that either complete schema has passed a configured provider. The first acceptance baseline must use the actual valid generated schema and its complete transport envelope.

## 5. Current-source findings versus the selected target

All source links in this section are pinned to the inspected commit. Future changes should update the maintained design/current-truth owners without rewriting these findings as though the old source already contained the target.

| Inspected owner | Verified baseline | Selected target and limit of the finding |
| --- | --- | --- |
| [decision-context.ts](https://github.com/Macrofold/OpenLegend/blob/0b1262a597ca718be54c287eea0619b073952f32/apps/server/src/decision-context.ts) | Existing preparation already assembles actor-permitted observations, required evidence, recall, choices and references. `activityDecisionFacts` supplies descriptors plus choices/warnings. `inputBytes` and `estimatedInputTokens` are calculated from the prepared prompt and base response instructions; the estimate is `ceil(bytes / 3)`. | Extend this existing owner with coherent situation selection, dependency coverage and complete request accounting. The diagnostic estimate is not a provider-token receipt and does not include the final schema. This is not a claim that the current code has no context selection or bounds. |
| [response-context.ts](https://github.com/Macrofold/OpenLegend/blob/0b1262a597ca718be54c287eea0619b073952f32/apps/server/src/response-context.ts) and [navigation-contracts.ts](https://github.com/Macrofold/OpenLegend/blob/0b1262a597ca718be54c287eea0619b073952f32/apps/server/src/navigation-contracts.ts) | Navigation serializes all activity descriptors; the formatter separately serializes the activity context, public supports and a hand-maintained response manual. | Render selected semantics once. Keep discovery, current support/destination geometry and exact request parameters when needed; avoid dumping the UI form or every public support into each decision. |
| [cognition-contracts.ts](https://github.com/Macrofold/OpenLegend/blob/0b1262a597ca718be54c287eea0619b073952f32/apps/server/src/cognition-contracts.ts) | `boundResponseSchema` builds request-specific entity/action enums and padded operation alternatives, filtering actual unsupported speech/appraisal branches. Reflection reuses operation payload definitions. | Export focused payload definitions and sparse operation alternatives. Preserve real capability restrictions and update reflection/preview consumers; relevance is not permission to remove ordinary thought, notes, goals or naming. |
| [ai-director.ts](https://github.com/Macrofold/OpenLegend/blob/0b1262a597ca718be54c287eea0619b073952f32/apps/server/src/ai-director.ts) | Adds actor-invention/appraisal context, builds the bound schema and enforces the total instruction/context byte bound plus a separate `levelLimit.schemaBytes` bound before generation. It serializes with Zod's draft-7 conversion and uses the request schema for previews/final parsing. | Include all additions in one finalized manifest and measured transport. The missing schema in the earlier preparation estimate must not be described as absence of all schema or input safety checks. |
| [domain response.ts](https://github.com/Macrofold/OpenLegend/blob/0b1262a597ca718be54c287eea0619b073952f32/packages/domain/src/response.ts) | Validates the operation array, response byte/operation limits, unique IDs, earlier dependencies and one active payload. Current envelope checks still expect inactive-field presence. Admission processes operations separately. | Update representation and all callers together. Preserve native authorization, real partial outcomes and speech/work concurrency; shape adherence alone never proves a feasible or completed action. |
| [validation.ts](https://github.com/Macrofold/OpenLegend/blob/0b1262a597ca718be54c287eea0619b073952f32/packages/ai/src/validation.ts) | Captures schema through bounded canonical serialization, strictly requires declared object properties, rejects references, compiles with AJV and freezes the captured schema. It also validates reported usage counters. | Retain the exact owned schema through dispatch and validation. Add local reference support only through its explicit later gate. A local byte calculation and a validated usage receipt are different evidence. |
| [client.ts](https://github.com/Macrofold/OpenLegend/blob/0b1262a597ca718be54c287eea0619b073952f32/packages/ai/src/client.ts) and [macrofold-decision.ts](https://github.com/Macrofold/OpenLegend/blob/0b1262a597ca718be54c287eea0619b073952f32/packages/ai/src/macrofold-decision.ts) | Direct generation uses Responses `instructions`/`input` and `text.format`; Macrofold generation uses native chat messages and `response_format`, with captured validation and explicit output limits. The latter has bounded context/schema serialization and full prepared-input serialization. | Measure and qualify each configured adapter's actual envelope, not a reconstructed prompt-only approximation. No switch to a new API, model, paid preparatory call or retry follows from this context design. |

The [AI-provider contract](../ai-providers.md) remains authoritative for routing, fresh sessions, usage normalization, reservations and final/uncertain outcomes. Native known-action selection and plan continuation have different inference needs from generative speech; shrinking one GPT-5 response format is only part of the coordinated context project. Reconsideration, preview, inspection, reflection-shared payloads and debugging must use the same applicable facts and shape owners without restoring a second full context envelope.

## 6. Official provider research and its limits

The following official documentation was checked on **2026-10-19**, after the relevant local source owners were inspected. These are external API facts and design inputs. They are not demonstrations against OpenLegend's configured GPT-5/OpenRouter/Macrofold route. Descriptions below are deliberately scoped; current documentation also includes newer model features that this project does not inherit automatically.

| Primary source | Supported finding | Consequence for this design |
| --- | --- | --- |
| [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) | The supported subset includes nested `anyOf` and definitions/references. The root must be an object, and declared fields must be required; objects require closed additional properties. Nullable values can represent optional values within a declared shape. Schema adherence is distinct from semantic correctness. | An object containing an operation array with sparse alternatives is a documented direction. Keep local/native validation and qualify the exact generated schema on each route. These rules do not require all eight payload names in every alternative. Local `$ref` refusal remains a separate constraint. |
| [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling#token-usage) | Callable function definitions are rendered into model input, count against context and are billed as input tokens. The guide recommends limiting unnecessary loaded definitions/descriptions. | Include any actual tool definitions/results in full accounting. The supplied request has a response schema and no top-level tools list; this finding does not establish that this request ran a tool loop or had a measured function-token cost. |
| [OpenAI token counting](https://developers.openai.com/api/docs/guides/token-counting) | The Responses input-counting endpoint accepts the same input format as Responses generation and accounts for model-input formatting. Local plain-text tokenization can miss role/boundary overhead and tools or schemas. | A matching full-payload count can support explicitly scoped qualification where applicable; it is not an automatic per-decision call. No counting request was made here, and a Responses count would not by itself verify the transformed OpenRouter chat envelope or the configured route's actual usage receipt. |
| [OpenRouter Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs) | Support is specific to the model's provider endpoint, can change over time, and can differ in strict enforcement and schema subset. `require_parameters: true` helps route requests to endpoints declaring support for the requested parameters. | Retain the existing routing constraint and qualify the actual configured endpoint and complete schema. A model name or general provider capability page does not establish compatibility, exact enforcement, measured savings or a reason to add a repair/retry call. |
| [OpenAI prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching) | Reuse depends on the full rendered prefix; schema/tool/settings changes can affect it. Structured output format adds schema/instructions. Stable useful content can precede changing content. Minimums, routing, retention and cache controls differ by model. Actual usage/cache counters and realized cost are the evidence. | Dynamic enums may affect cache reuse, but their net effect here is unmeasured. Optimize useful stable prefixes after removing waste; do not add irrelevant text to meet a cache threshold. Do not import newer-model cache controls or promise a fixed 1,024-token minimum for the supplied GPT-5 route. |
| [OpenAI evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) | Evaluation should reflect the real task distribution, use explicit success criteria and compare changes; quantitative scoring benefits from calibration with human judgment. | Separate mechanical coverage, independent character behavior, player enjoyment and total economics. An exact JSON fixture proves neither informed judgment nor fun. No provider guide sets OpenLegend's acceptance thresholds or establishes the proposed savings. |

**Inference from these sources and the code:** a second field-by-field response manual is a strong removal candidate because the schema already communicates structure, while brief game semantics still need explicit representation. A stable schema can improve reuse only when the actual rendered prefix and route cooperate. These are design reasons to measure changes; they are not a promised cache-hit rate or proportional latency saving.

The earlier statement that schemas/tools are part of input is retained with this distinction: official documentation explicitly establishes the input-token treatment of callable function definitions and the addition of Structured Outputs schema/instructions to rendered input. Neither gives the exact token charge for this exported `response_format`. The missing evidence is the configured provider's real usage for the complete admitted request, including cached/uncached counts and any independently admitted preparation.

## 7. Additional design decisions that must survive implementation

| Conversation requirement or resolved issue | Recorded decision | Detailed owner |
| --- | --- | --- |
| Only necessary context, but every fact needed for an informed decision | Optimize complete permitted meaning. Required identity, trigger/corrections, work outcomes, obligations and their dependencies cannot be dropped to meet a convenient token target. If they cannot fit or be prepared, follow explicit defer/failure semantics. | Feature spec; technical design sections 2, 4 and 6; [memory architecture](../memory-architecture.md). |
| Dynamic situations | Use overlapping supported situation signals and their union, not a mutually exclusive dialogue/combat/work prompt choice. A person can converse while traveling, protect someone while pursuing a goal, or notice a pleasant opportunity during ordinary work. | Technical design sections 5–6. |
| Preserve the person | Full accepted About me remains. Derived retrieval cues may locate associations but do not replace biography with keywords, conditional policies or a per-request summarizer. Current work, possessions, locations and chosen intentions keep their mutable owners. | [Character authorship](compelling-characters-feature-spec.md#character-authorship-and-changing-personality); technical design section 2. |
| Keep creative choices available | Suggestion lists are assistance. Preserve useful capability meanings, applicable retained methods, relevant alternative object properties and supported inspection/open attempts. Selection supplies evidence rather than the desired solution. | Feature spec; technical design sections 7–9; [actions](../repertoires/actions.md), [work and crafting](../repertoires/work-crafting.md). |
| Fun and distinctiveness are first-class requirements | Include actual tastes, quiet opportunities, commitments, mixed motives, shared jokes, particular objects, curiosity and independent purposes when they matter. A character's relevance is not limited to danger, productivity or serving the player. Enjoyment and refusal are not prescribed outcomes. | Feature spec; [gameplay priorities](../repertoires/gameplay-priorities.md); repertoire review companion. |
| Repertoire priorities | Product Priority is not a runtime relevance score. A Detail-ranked keepsake or an enabled world's Specialist rule can be required decision evidence. Do not remove it because it has a lower catalogue rank. | [Selection and scale](../repertoires/selection-and-scale.md); feature spec. |
| Preserve disagreement and meaningful consequences | A relationship label cannot replace the relevant issue, exact promise, later refusal, changed taste, actual partial result or known contrary evidence. Only acquired evidence about another person is available. | [Relationships](../repertoires/relationships.md), [diplomacy](../repertoires/diplomacy-conflict.md), [history](../repertoires/history-myth.md). |
| Correct uncertainty and identity | Permission filtering precedes retrieval/ranking. Partial, unavailable, stale, unrequested and forbidden are distinct from complete absence. Exact references and role/namespace meaning survive deduplication. | Technical design sections 4, 6 and 7; [identity](../identity-and-references.md). |
| Numbers and spatial context | Preserve actor-permitted measurements, units, ranges and execution-sensitive boundaries. Do not independently round canonical facts or remove necessary geometry; presentation precision belongs to its semantic owner. | Technical design section 7.4; [spatial world](../spatial-world.md). |
| Scale and performance | Select permitted metadata/IDs before large optional bodies and exact geometry where the source owner permits it. A short final list does not excuse a whole-world scan. Bind all dependencies and final references to one retained preparation. | Technical design sections 4–6; [selection and scale](../repertoires/selection-and-scale.md). |
| Detail access | First fix required initial coverage and use existing native inspection. No automatic second generation, paid context summarizer or generic new detail loop is required. A richer within-job read route needs a concrete missed-opportunity case and its existing owner's explicit gate. | Technical design section 8; maintainer and limits records. |
| Preserve all consumers | Current response parsing, native admission, direct/Macrofold dispatch, preview, reconsideration, shared reflection payloads and debugging must agree. Do not add a parallel old/new schema compatibility system as a substitute for a coordinated change. | Technical design sections 3 and 9. |
| Remove revision echoes and duplicated work mode | First qualify the sparse shape with existing revision fields. Selected later SC12 binds revisions from the retained exact read set, requires explicit same-reply dependencies for earlier accepted writes, and uses actual native receipt metadata. A nonempty note cannot be replaced without its full prepared text. Derive one shared work mode only where the installed definition declares identical meaning. This stage is specified; local schema references remain separately conditional. | [Technical design section 10](situation-aware-cognition-context-tech-design.md#10-later-refinement-server-bound-revisions-and-one-work-mode); SC12. |
| Complete measurement | Track instructions/context/schema/tools, full transport, selected-source coverage, native preparation work, actual input/cache/output usage, latency and realized total cost. Count any existing separately admitted preparation; a smaller final generation alone can hide a more expensive decision. | Technical design measurement/qualification sections; [AI providers](../ai-providers.md). |
| Preserve evidence standards | Deterministic fixtures establish coverage/admission; independent model runs establish use of evidence; humans establish player value. Existing explicitly required combat behavior keeps its actual acceptance criteria rather than becoming optional under a generic "many valid choices" rubric. | Feature qualification; [compelling characters](compelling-characters-feature-spec.md); owned verification records. |
| Finish design and keep docs consistent | Design-complete overlapping work may be marked designed, while implementation and qualification remain open. Existing work IDs, owners and useful history are preserved. The user authorized repertoire additions/removals, but the actual adopted changes follow reviewed gaps rather than adding content for volume. | Maintainer record, cognition limits, paired specs and repertoire review. |

The important player-facing opportunity is that cheaper preparation can support **more frequent, better informed encounters with recognizable people**, while selective evidence makes specific tastes, surprising uses and unfinished commitments easier to act on. This remains a product hypothesis to test. Merely producing shorter requests or longer conversations would not establish that OpenLegend became more compelling.

## 8. Open evidence questions and deliberate deferrals

These are evidence boundaries, not unchosen basic product behavior. Implementation tasks and their statuses live in the maintained tracker.

| Item | Current disposition | Evidence needed to close it |
| --- | --- | --- |
| Origin of the exported `type: null` declarations | **Open investigation.** Do not label production broken from this export. | Same-attempt comparison of generated schema, locally captured request, exported view and actual provider-bound body, using existing bounded diagnostic access. |
| Earlier 9,919-character `$defs` illustration | **Historical illustration, not a target.** Initial sparsity remains selected without references. | Retain a reproducible actual schema transformation if later shared definitions are evaluated; compare complete valid schemas and route behavior. |
| Real token/cache/cost/latency improvement | **Unmeasured.** No saving percentage is claimed for shipped behavior. | Matched complete requests, actual provider receipts and preparation costs under the qualification plan, with model/route/settings recorded. |
| Whether necessary opportunities survive economical selection | **Unqualified.** Mechanical dependency coverage is necessary but cannot prove every possible useful association was anticipated. | Changed-situation/changed-person comparisons, deliberate required-fact counterexamples, missed-opportunity analysis and human playtests. |
| Richer within-job detail tools | **Deliberately gated.** Existing native inspection is the initial design. | A demonstrated important miss that better initial selection and supported inspection do not resolve, followed by the owning bounded-cost/access design. |
| Final scale defaults or later cache/reference tuning | **Owned by the paired design and limits record.** This evidence file creates no second set of budgets. | Qualification against the implemented owners and configured route; update the owning numbers rather than historical attachment measurements. |

## Maintained records

- [Situation-aware cognition context: feature specification](situation-aware-cognition-context-feature-spec.md)
- [Situation-aware cognition context: technical design](situation-aware-cognition-context-tech-design.md)
- [Cognition-context maintainer record](../maintainers/cognition-context.md)
- [Cognition limits](../limits/cognition.md)
- [Memory architecture](../memory-architecture.md)
- [AI-provider routing, usage and outcome contract](../ai-providers.md)
- [Repertoire index](../repertoires/README.md) and [selection and scale](../repertoires/selection-and-scale.md)
