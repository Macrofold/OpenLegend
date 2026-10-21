# Situation-aware cognition context: technical design

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | The design is being completed; runtime implementation and qualification have not started. | 2026-10-19 |

## 1. Scope, baseline and controlling contracts

This document specifies the implementation of [situation-aware cognition context](situation-aware-cognition-context-feature-spec.md). It changes how the server prepares and presents an informed character decision, not what the character is allowed to know or do. The source baseline is `Macrofold/OpenLegend`, `main`, commit `0b1262a597ca718be54c287eea0619b073952f32`. Statements headed **Current** describe that inspected implementation. **Target** describes this design. No runtime improvement, provider-token saving or character-quality result is established by this document.

The [memory contract](../memory-architecture.md#3-one-compact-model-facing-context) owns actor perspective and required evidence; [action availability](../action-capabilities.md#action-availability-and-temporary-execution) owns executable choices; [identity](../identity-and-references.md#contract) owns exact references; [save/load](../save-and-load.md#continuation-and-identity) owns continuity; [AI providers](../ai-providers.md) owns dispatch and financial outcomes. This design supplies their coordinated context implementation. It creates neither a second memory store nor an action authorizer. The [engine/world boundary](../engine-and-world-boundaries.md#5-a-repeatable-boundary-decision) remains controlling: installed content supplies its meanings, while the server enforces permitted reads, bounded work and final admission.

The initial scope covers ordinary generated decisions, direct replies, ordinary native action selection, configured decision reconsideration, the selected threat-deliberation strategy, existing native inspection results, and every debug/preview/provider consumer of the same preparation. Reflection and consolidation reuse the corrected shared payload definitions and evidence rules, but this project does not turn ordinary cognition into the reflection harness. A request begins with fresh model conversation state under the existing policy.

## 2. Non-negotiable properties

1. **Preserve complete accepted identity.** The accepted About me text, protected author-defined identity and current character voice are not truncated, replaced with keywords or rewritten by a per-request summarizer. Derived retrieval cues never replace that text in a generative character decision.
2. **Preserve the complete required actor-permitted evidence.** The initiating cause, independently required coalesced causes and personal work outcomes, relevant corrections, protected commitments, current goals/work, and dependencies necessary to interpret the selected situation remain present. This means complete permitted meaning, not omniscient knowledge or every historical record.
3. **Keep independent choices.** A short action list is assistance. Unlisted attempts, declining, quiet continuation, curiosity, play, affection, solitude, humor and other supported noninstrumental choices remain possible. Relevance cannot become a native permission check or prescribe the emotionally correct response.
4. **Keep speech and action together.** One reply may contain speech, action and other independent operations, including repeated kinds. Each array entry represents one operation. Physical completion and admission order are different: an accepted walk can continue while a later permitted speech operation is spoken.
5. **Preserve exact references.** Every model-visible object/person/action/method/knowledge handle has one matching request-owned binding. Names are labels, never an alternative resolver. Removing UI form metadata never removes the References mappings.
6. **Preserve uncertainty and limitations.** A partial inventory page, failed retrieval, inaccessible container, uncertain identity or unprepared action is not evidence of absence. A person's statement remains testimony; an inspection is not proof that the described event happened.
7. **Keep costs and outcomes honest.** Preparation does not consume native resources, random numbers or durable object IDs. No automatic paid repair, mandatory new detail round or hidden summarization call is added. Existing separately authorized routes retain their own accounting and failure rules.
8. **Use one accepted snapshot and explicit dependencies.** Retain owned immutable preparation across waits. Recheck changed authority, evidence and operational prerequisites at the responsible boundary; do not rebuild an answer from a mutable global “latest context.”
9. **Optimize work before output.** Select permitted IDs and payload sizes before hydration, formatting, exact geometry or schema expansion wherever the owning query supports it. A final 16-row list does not justify scanning every item or person first.
10. **Measure the full request and actual play.** Count instructions, selected facts, reference text, schemas, tools when present, output allowance and any separately admitted preparatory calls. Actual provider usage remains distinct from local estimates. Smaller requests alone do not prove informed or enjoyable behavior.

The hard guarantee is mechanically checkable coverage of declared required sources and dependencies. No finite selector can prove it anticipated every surprising connection an intelligent character might make. The design therefore retains broad opportunity discovery, clear coverage and existing explicit inspection, and evaluates missed opportunities as a first-class quality failure.

## 3. Current implementation and required integration

| Existing owner | Current responsibility or concrete gap | Target responsibility |
| --- | --- | --- |
| `apps/server/src/decision-context.ts` | Prepares required facts, recall, actions, installed requests and references; refreshes after asynchronous attention; estimates tokens from prompt bytes only. | Own the coherent preparation transaction and final context manifest; obtain metadata before optional bodies; run situation selection and dependency closure; retain request-owned bindings through dispatch/publication. |
| `apps/server/src/response-context.ts` | Renders readable sections, duplicates the installed activity catalog, and emits a long independently maintained response-format manual. | Render each selected fact once from typed prepared sections; keep concise semantic guidance and a complete reference map; never attach a second field-by-field schema manual. |
| `apps/server/src/decision-observation.ts` and `context.ts` | Observe actor state and prepare candidates; inventory paging currently occurs after `observeActor` returns an inventory. | Use the same native observation/access owners with selective inventory metadata/page reads before large bodies; preserve equipped and already-bound tools plus actual page coverage. |
| `apps/server/src/entity-references.ts` | Allocates observer handles and resolves model fields/explicit annotations; first `entityHandles` use currently hashes the entire entity collection. | Build only the selected permitted reference closure at this existing owner; avoid whole-world hashing; preserve opaque scoped identity and deterministic collisions. |
| `apps/server/src/cognition-contracts.ts` | Defines immediate operations and reused reflection payloads; current provider alternatives carry inactive null fields. | Export focused payload schemas and one sparse operation union, shared with local parsing; build request-specific reference and capability constraints without null padding. |
| `apps/server/src/navigation-contracts.ts` | Defines navigation and installed-request shapes, with independently selected family and parameter alternatives. | Pair each family with its exact parameter shape; derive model descriptions from installed semantic definitions, excluding form layout/button metadata. |
| `apps/server/src/ai-director.ts` | Chooses routes, adds appraisal/invention context and schema, dispatches, previews and publishes. | Consume the finalized preparation; count additions before paid dispatch; preserve ordinary route selection and the separately selected threat strategy; use the same sparse parser for preview and final validation. |
| `apps/server/src/decision-preparation.ts`, `decision-escalator.ts` | Reprepare a configured higher-model reconsideration using native/cached evidence. | Use the same selector and sparse contract with existing no-paid-preparation restrictions; do not serialize a second raw character envelope or invent a retry. |
| `apps/server/src/activity-request-choice.ts`, `action-response.ts`, `action-grounding.ts`, `typed-actions.ts` | Build and ground known/invoked/proposed responses. | Preserve exact mode, purpose, quantities and references through the sparse shape; selected descriptions do not replace native meaning. |
| `packages/domain/src/response.ts`, `agency.ts`, `action-capabilities.ts` | Validate/admit independent operations, goals, plans, invocations and continuations. | Update current operation representations and callers together; keep one mutation owner, current checks, truthful partial receipts and output dependency semantics. |
| `packages/ai/src/validation.ts`, `client.ts`, `macrofold-decision.ts`, and `apps/server/src/macrofold.ts` | Capture schemas/bytes, validate provider responses, execute direct or Macrofold generation and settle outcomes. | Retain the exact prepared request for hashing, dispatch and validation; apply full size/usage diagnostics to every route. `$ref` remains disabled until the explicitly gated refinement below. |
| `apps/server/src/npc-reply-preview.ts` | Retains a private early-speech backend path; the world-first client has retired its provisional row. | Accept only a complete independently valid talk operation under the exact final request contract and current listener permissions. Do not restore retired UI or disclose speculative text through Events/captions. |

Add one focused server module, `apps/server/src/decision-context-selection.ts`, for the pure situation-signal collection, dependency closure and deterministic selection functions described below. Keep orchestration in `decision-context.ts` and rendering in `response-context.ts`. Add a separate type file only if actual import cycles require it; this design does not prescribe a new package, service or extensible orchestration framework. The selected world's context-purpose descriptions belong beside its existing cognition/activity definitions. Native source owners expose narrow read contracts, rather than allowing arbitrary predicates or generated code.

Implementation is a cross-layer change of moderate/high risk: missing evidence, stale references or a schema mismatch can affect every character decision. Plan for approximately 1,000–2,000 changed non-test logic lines across these existing owners plus one focused selection module, then refine that estimate against the first implementation diff. It is not a promise of scope or a reason to build unrelated infrastructure.

## 4. Typed preparation model

### 4.1 Scope and immutable ownership

`DecisionContextScope` contains existing world/timeline/generation, actor and physical-life identity, authorized request/audience/control state where applicable, decision/job ID, captured native sequence/simulation time, selected cognition and installed-definition pins, and accepted About me revision. It also retains privacy/evidence revisions and the selected source families needed by the existing publication guards. These values stay server-side except meaningful time, audience or uncertainty the character needs to understand.

`PreparedDecisionContext` owns:

- The frozen scope and an immutable selected-source manifest.
- The selected situation signals and their exact support keys.
- Read-only context units and their dependency graph.
- The required/optional disposition of each selected unit and a reason for that disposition.
- Final rendered instructions/context, sparse schema, reference bindings and action bindings.
- Request-budget accounting and coverage summaries.
- Dependency revalidation and admission callbacks using existing semantic owners.

Capture immutable IDs/scalars or owned copies. Do not retain Immer draft proxies, a mutable `WorldState`, a borrowed reusable cache slot or arbitrary raw source objects as the prepared result. Existing pure native preparation can be retained only under its documented lifetime/dependencies. An unrelated request replacing a shared cache does not erase the retained preparation. A relevant authority or source change can still invalidate it.

The final render, schema, reference map and binding digest must all describe the same finalized manifest. Late additions from appraisals, actor invention or selected activities are admitted into that manifest before the request is frozen; they cannot append unaccounted text or new schema references afterward.

### 4.2 Context units and source identities

A `ContextUnit` is one source-owned, actor-permitted meaning that can be included or omitted as a whole. It is not an additional stored memory. Its discriminated family is one of identity, body, current work, obligation, personal evidence, feeling, perceived entity/contact, possession, known method, installed capability, semantic instruction, reference or coverage. Each unit carries:

| Field | Meaning |
| --- | --- |
| `key` | An unambiguous structured key with world/timeline, actor, source family, stable source identity, revision and selected view where required. Use the existing key/digest owner; never concatenate arbitrary IDs with delimiters. |
| `source` | Exact retained evidence, installed definition or native projection owner and its version/dependency stamp. Several source families may legitimately share an ID. |
| `disclosure` | Already-validated actor scope and supported perspective; no raw hidden state is available to the selector. |
| `meaning` | Typed permitted values/roles/qualifiers, or exact attributed authored prose. |
| `dependencies` | Exact unit/reference/definition keys needed to interpret this unit safely and meaningfully. |
| `requiredReasons` | A set of explicit reasons, such as initiating cause, current obligation, selected threat strategy, bound work, contradiction/correction, or dependency of another required unit. Empty means optional; no semantic model may clear a nonempty set. |
| `selectionSignals` | Structured topic/subject/purpose/situation associations for existing retrieval and relevance, without promoting an inferred connection to fact. |
| `representations` | Available deterministic complete wording, existing valid source-linked compact wording where allowed, and an optional discovery description. Each states what meaning it preserves; a discovery description is not a substitute for required detailed evidence. |
| `size` | Known encoded lengths or conservative bounds from source metadata before full hydration; final rendered bytes are checked again. |

Deduplicate only the same source/meaning and compatible view, retaining the union of roles and dependencies. The same utterance as trigger and recent memory is one source with both reasons. Two similar utterances by different people are two occurrences. A quote and a claim that it describes a true event are different meanings. A corrected account and its correcting evidence remain distinguishable. Two purposes using the same physical first action remain separate choices.

### 4.3 Coverage has explicit outcomes

Use a discriminated result at each source-family query and dependency expansion:

| Result | Permitted interpretation |
| --- | --- |
| `complete` | The scoped query established all results under its stated predicate and snapshot. Only this can support a negative statement for that predicate. |
| `partial` | A valid page/subset is supplied; retain its cursor or continuation capability and what remains unsearched. Do not calculate an exact omitted count by scanning the rest. |
| `notRequested` | The family/detail was unnecessary for this request or remained optional. It is not evidence that nothing exists. |
| `unavailable` | A required read/optional service failed, was exhausted or could not be prepared. Preserve whether a usable subset exists; never substitute an empty complete result. |
| `stale` | A relevant scope/source/permission changed. The old content cannot be newly disclosed or accepted as current. |
| `forbidden` | The current actor lacks permission to obtain the requested meaning. The model-facing result must not reveal the hidden resource or reason beyond the owner's permitted refusal. |

Render coverage only when it could change the character's decision: for example a partial possession page, uncertain attribution, unavailable recollection or an uninspected container. Keep diagnostic counts and internal codes out of ordinary character instructions. Preserve distinctions between current observation, last seen, heard report, inference, imagination, correction and known absence.

## 5. Situation detection without an exclusive classifier

Compute a set of independent supported signals from the captured actor-permitted snapshot. More than one can be active; their required contexts are unioned and deduplicated. Native signal collection identifies which information/operations may matter; it never decides the character's preferred behavior. Use exact event kinds, installed capability metadata, current work, body-policy conditions and source associations. Do not use a keyword such as “wolf” or “fire” as a universal engine rule, and do not purchase another model call just to choose a prompt template.

| Signal | Exact eligibility/support | Additional context that becomes required |
| --- | --- | --- |
| Directed or socially relevant speech | Actor's actual permitted speech evidence and received role, including directed but unintelligible speech. | Exact heard words/gaps, perceived speaker/addressee roles, meaningful current source visibility, immediate exchange dependencies and unresolved question/refusal/commitment needed to interpret the trigger. |
| Present threat or urgent bodily change | Admitted personal threat/contact/cause, installed body condition or selected threat-strategy subscription. | All relevant simultaneous permitted threats, current protective means/work consequences, exact relevant feelings and their source/scale, required strategy choices and material alternatives. |
| Ongoing or changed work | Actor's actual current/paused frontier, accepted cooperation, changed resources or fresh result. | Current purpose, remaining/paused work, exact bound tools/targets, sunk/held resources, interruption/replacement consequences and source-linked actual outcomes. |
| Goal or obligation reconsideration | A current goal/commitment becomes relevant through its owned state, due boundary, selected subject or new evidence. | Exact intention/terms, current status and source, known necessary constraints, contrary evidence and consequences of abandoning or delaying it. |
| Travel or spatial decision | An offered/continued spatial action, known selected place, relevant lost target, unfamiliar arrival or source whose geometry changes the choice. | Current permitted position/support and meaningful destination geometry, last-seen versus visible distinctions, route/preparation uncertainty and only the supports needed to specify/use the current choice. |
| Inventory or material decision | Exact bound work, a relevant need/method/target, a changed possession, selected inspection or explicit request for stock. | Relevant quantities/instances/equipment/permissions and actual inspected page, including missing prerequisites and whether more stock remains unsearched. |
| Social coordination | Current received invitation/agreement, accepted help, belonging/relationship evidence or proposed cooperative action. | Exact parties/terms/deadlines/consent, individual agency, continuation versus independent work consequences, relevant directional knowledge and source-labeled feelings. |
| Learning or discovery | A retained discovery/inspection/lesson, known-method selection, unfinished method prerequisite or explicit inquiry. | What was actually learned/read, exact method/definition pins and available outputs, remaining unknowns and ordinary ways to inspect/practice/use it. |
| Quiet opportunity | Actor is eligible for ordinary thought/choice and has current permitted interests, positive experience, spare attention or environmental affordances. | No fabricated obligation. Retain applicable opportunities from existing curiosity/enjoyment/company/rest guidance and relevant positive/ambivalent memories alongside practical choices. |
| Correction or uncertainty | Exact corrected/forgotten source, unrecognized subject, partial source coverage, conflicting retained accounts or unresolved action fulfillment. | Correction/uncertainty, eligible supporting and contrary sources, exact omitted requirement and usable inspection/clarification route. |

The absence of a signal is not proof that a capability is irrelevant. Each ordinary request also retains compact information on actually available broad capabilities and the existing open-attempt path. A mixed “spoken warning while carrying supplies under attack” decision includes social, threat, body, inventory and work context. Never replace it with a speech-only prompt because speech was the last event, or a combat-only persona because a threat exists.

## Maintained records

- Implementation and unsatisfied acceptance: [SC01–SC12](../maintainers/cognition-context.md).
- Numerical, behavioral and removed/no-limit choices: [Cognition limits](../limits/cognition.md).
- Product scope and playable scenarios: [Feature specification](situation-aware-cognition-context-feature-spec.md).
- Shared contracts: [Memory](../memory-architecture.md), [action capabilities](../action-capabilities.md), [identity/references](../identity-and-references.md), [provider execution](../ai-providers.md), and [save/load](../save-and-load.md).
