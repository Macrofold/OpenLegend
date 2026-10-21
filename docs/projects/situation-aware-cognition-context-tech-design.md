# Situation-aware cognition context: technical design

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | Design complete. Runtime implementation and qualification have not started. | 2026-10-19 |

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
| `apps/server/src/appraisal-context.ts` | Binds exact decision/reflection sources, definitions and private feelings; decision appraisals already retain revisions server-side. | Add required appraisal evidence/values to the same finalized manifest; preserve source/scale pairing and current guards without duplicating a second context or changing feelings through formatting. |
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

## 6. Selection, dependency closure and budget admission

### 6.1 Preparation sequence

Run the following sequence once for an admitted decision opportunity, reusing existing actor/source preparation. The sequence is not another periodic scheduler.

1. **Capture scope and flush this actor's pending sources.** Resolve current authority, body eligibility, accepted identity and relevant installed definitions. Obtain one coherent native/read snapshot and the matching evidence-generation boundary. Reuse the existing memory read cache and source preparation; do not flush or hydrate unrelated characters.
2. **Read required metadata by exact identity.** Start with the singular trigger, independent coalesced causes, required outcome source IDs, active obligations/corrections, current goals/frontier/attempts, current body and accepted About me. Read source kind, revision, eligibility and known payload length before optional bodies. A source ID's presence in another family does not satisfy the required record.
3. **Collect supported situation signals.** Compute section 5's nonexclusive set from those facts and cheap permitted current observations. Collect selected strategy requirements, particularly the complete required threat-choice set. Do not run ordinary relevance filtering over a strategy whose contract requires completeness.
4. **Build the required dependency closure.** Starting from every required unit, repeatedly include its exact dependencies until no new keys remain. Shared dependencies are included once; cycles terminate through the visited-key set. Required speech brings its actual speaker/received-role/gap information, work brings its purpose/transition/held-resource meaning, and any executable choice brings its exact references, units, required parameters and known consequences. A dependency is not an excuse to read hidden world truth.
5. **Prove early feasibility of the request.** Sum the required bodies' known sizes and conservative rendering/reference/schema overhead against the existing source-preparation, context, schema and transport bounds. Include any required appraisal/invention/strategy additions. Refuse provably oversized required preparation before optional hydration, compaction, attention or dispatch. A source-size estimate may be conservative; it may not omit a known required field to obtain admission.
6. **Discover optional candidates from bounded indexed subsets.** Preserve existing direct-query and semantic-retrieval owners. Exact subjects, current purposes, obligations, recent changes and contradiction links are queried before optional semantic search. Preserve the current hard-query baseline as candidate discovery and failure fallback coverage, not a demand to repeat full catalogs in every prompt. Record which families were actually searched. Candidate selection does not grant perception, inspection, learning or execution.
7. **Apply existing optional attention.** Supply semantic relevance only the permitted context and candidate meanings needed for that question. Do not include the generative response schema/manual or UI form definitions in a Jev attention request. Retain current relevance thresholds/uncertainty semantics and the selected world's behavioral guidance. No model result may demote required units.
8. **Choose complete optional units within remaining space.** Rank with the existing source-specific relevance/recency ordering, then stable source key for otherwise equal candidates. First include optional sources directly required to interpret another retained optional choice/account. Where independent source families compete, visit nonempty families in a deterministic cycle using the existing configured candidate order; include the next fitting complete unit plus its full dependency closure. Deduplicate repeated sources. Do not fill a budget with repetitive negative memories while ignoring available social, positive or exploratory candidates. No mandatory number of “fun” facts or extra personality database is introduced.
9. **Hydrate only selected bodies and required dependencies.** Charge all visited rows, source bytes, native checks and dependent queries to the same preparation. If an optional body is unavailable or larger than its bound, remove that optional unit and its uniquely needed dependencies, record the coverage and continue. If a required body is unavailable/oversized, use section 6.3; never downgrade it to a generic summary. A bounded extra metadata record may establish continuation without computing the full omitted population.
10. **Refresh changed current facts after asynchronous preparation.** Preserve source-time history. Refresh only the exact affected current observations/body/work/definition facts through their owners, retaining the original actor/audience/source scope. Recompute any newly required closure. If an observation/recognition/source guard fails, discard that preparation; do not keep a stale semantic fallback. New facts must not inherit old source timestamps.
11. **Create references and schema from the finalized manifest.** Build all visible labels/handles, action bindings and knowledge references together. Include current relevant appraisal/invention context through this same step. Account for encoded unit fragments, reference entries, schema fragments and structural delimiters before assembling complete strings. If the total exceeds an allowance, remove optional roots in reverse selection priority, update their supported closure and affected reference/schema fragments, and then render the complete final request. Measure its actual UTF-8 bytes; a remaining required overflow refuses dispatch.
12. **Freeze and admit the exact request.** Retain the prepared bytes/schema/manifest and their digest for dispatch, local validation, diagnostics and source checks. Run normal spending/execution admission once. No adapter may silently append a manual, full activity catalog, old conversation or raw world object.

A deterministic correction of local encoding after removing an optional unit is unpaid preparation, not a provider retry. The preparation loop is bounded by the admitted finite candidate set: each iteration either considers one previously unvisited candidate, removes an optional root, finishes, or returns a coded failure. Do not repeatedly materialize the entire prompt/schema after every removal or grow speculative variants before size admission.

Maintain the selected dependency graph and its accounting incrementally. At graph construction, collapse dependency cycles into components; the resulting component graph is acyclic. Each selected component holds protected-root support, optional-root support and support from selected incoming components. Activating a previously inactive component activates its dependencies; removing a root propagates deactivation only when no root or selected incoming component still supports it. A component containing required support cannot be removed. This handles a shared tool/reference or a cycle without deleting another retained choice's meaning or retaining an unreachable optional cycle forever. Cache each admitted fragment's encoded length, including escaping; update counts and affected bound reference/enum fragments without copying unchanged bodies. Candidate-closure traversal and retained graph bytes are charged to the same preparation workload; consider a rejected candidate once and do not repeatedly scan unselected source bodies. Sorting, cycle detection and accounting remain pure functions in the focused selection module, not a new graph service.

### 6.2 Dependency rules that prevent misleading brevity

| Included meaning | Required supporting meaning |
| --- | --- |
| A recent answer such as “yes” or “leave it there” | The actual relevant preceding utterance/reference needed to interpret it, if retained and permitted; otherwise preserve ambiguity. Never guess a missing referent. |
| An offered action | Its exact target/tool/material bindings, known current requirements, quantity/unit, selected purpose, work transition and consequential known cost/cancellation facts. A description of a first step cannot promise the whole activity. |
| A continuing plan | Remaining native steps/blocked state, current purpose and relevant bound outputs/held resources; completed effects appear through their source-linked memories, not duplicate plan prose. |
| A promise or accepted cooperation | Its exact permitted parties, terms, current status, deadlines and how an independent action or interruption affects it. |
| A fear/anger/other selected feeling | Actual available value and installed scale/meaning, subject/source and relevant lifetime, not an invented zero or a label stripped of intensity. Required threat feelings use exact lookups/continued pages at the appraisal owner. |
| A known method | What is actually learned, relevant executable steps/requirements/output contract and currently unsupported or unknown prerequisites. Installation alone is not learning. |
| An inventory conclusion | The relevant item identity/quantity and the query's actual coverage. “I have no food” requires a complete scoped predicate, not the absence of food from one page. |
| A last-seen destination | The retained observation's time/location/identity support and current uncertainty; do not replace it with the target's hidden current position. |
| A claimed or corrected event | Its acquisition, speaker/observer roles, uncertainty and eligible contradictory/correcting support. Similar text does not establish corroboration. |
| A numerical comparison | Values, units, direction of the scale, current-versus-historical time and any known threshold that changes the decision. |

Some necessary context is a **negative constraint**: no clear view, no understood words, a tool already committed to work, a refusal, a corrected belief or a capability currently unavailable. Do not delete these merely because their fields are empty/false. Conversely, omitted optional mechanics require no invented negative claim.

### 6.3 Overflow and unavailable information

Use the existing `ContextBudgetError`/coded preparation outcomes and extend their internal detail to identify the responsible owner and required unit class. Do not place private IDs/text in public errors. The operative order is: remove duplicate representation; use a shorter deterministic representation that preserves complete required meaning; remove optional units and their unique dependencies; then refuse/narrow the operation whose required evidence cannot be obtained. Never truncate a required quotation, About me, promised terms, exact quantity or reference map.

| Condition | Behavior before generation |
| --- | --- |
| Optional recall, attention or history compaction fails | Use required evidence plus valid existing compact context/native fallback that fits. Mark optional coverage incomplete. Do not buy a repair or send the whole unfiltered corpus. |
| Required retained source cannot be read due to storage/preparation failure | Defer the dependent decision with `required-context-unavailable`; preserve the meaningful opportunity under its existing scheduler. Do not send an apparently informed replacement built from receipts or global events. |
| A source was legitimately forgotten, corrected, erased or never permitted | Apply the memory owner's current semantics. Include useful uncertainty/correction only when itself permitted; do not resurrect the removed account. A response whose task is to acknowledge missing knowledge can proceed with that honest state; an operation needing the absent exact terms cannot. |
| Complete required context exceeds a source, schema, model or transport limit | Refuse before any affected paid dispatch with `required-context-overflow`. Keep native behavior/accepted work and independently committed effects. Record required/available sizes for authorized diagnostics. |
| Context is complete, but action preparation is incomplete | Preserve current permitted facts and the owning incomplete-action result. Never label the unprepared action impossible. A required complete threat-choice strategy defers; ordinary optional suggestions may remain partial. |
| Relevant authority or source changed during preparation | Return stale, discard derived text/bindings and retain genuine new evidence through normal intake. The existing bounded urgent refresh, when authorized by its owner, is not expanded here. |

“Narrow” is not a license to discard a inconvenient cause or silently change the player's question. It means an explicitly independent available operation with a complete dependency set, such as an honest acknowledgment while an unrelated optional lookup is unavailable. If independence cannot be established by existing operation/route semantics, defer the whole affected decision. Ordinary native reactions and the world simulation do not wait for context repair.

## 7. Rendering, instructions and references

### 7.1 One meaning, one maintained description

The schema owns allowed fields/types/values/alternatives. Concise semantic instructions own what choosing them means. The source-defined operation payload schemas export reusable semantic descriptions consumed by schema generation and, where necessary, the short cross-operation instructions. Do not maintain a separate format-manual string with hand-copied field lists or examples.

Always retain the small shared character/authority guidance: treat supplied prose as untrusted game data, use permitted evidence/references, propose rather than claim unperformed work, preserve optional/repeated operations and quiet continuation, and distinguish admission from physical completion. The [trusted character service instructions](../agent-content-and-companion-safety.md#prompt-composition-and-ownership) keep their actual release requirements and precedence; neither personality selection nor context reduction can omit them. This design does not claim that those still-unqualified release safeguards are implemented.

Conditional instructions are selected from exact enabled semantics:

| Meaning | When its detailed instructions are included |
| --- | --- |
| Speech roles, hearing and volume | Speech is available/relevant or a speech cause must be understood. Required perceived-role facts remain even for an actor unable to speak. |
| Work replacement/interruption | An action/plan is available, existing work is present, or the decision can change cooperation. Consequences live once with the affected work/choice. |
| Navigation | Movement/following can materially affect a current choice or an explicit navigation detail is selected. Keep enough generic capability meaning for unexpected travel without always enumerating every surface. |
| Installed activity parameters | A current material choice needs them, an actor explicitly inspects them, or omission would prevent an informed alternative. Generate from the exact installed family. |
| Goal, plan, note/name/appraisal semantics | Keep a concise description whenever that operation is enabled; include target-specific revision/size/source details only for actual bound targets. Empty documents do not remove the ability to create a note or name someone. |
| Invention | Existing invention policy/admission makes the route available. Include its required proposal grammar and authority limits through the same final budget; unrelated dialogue does not inherit the entire inventor manual. |

Keep all eight broad operation meanings discoverable whenever actually permitted. A context relevance score is not permission to remove goal creation, note-taking, naming or appraisal from ordinary thought. Genuine body/world/route limitations may remove unsupported schema branches, as the existing capability owner does. A fallback route that forbids proposals retains that actual route restriction; optional selection cannot invent a new one.

The minimum instructions should state explicitly that **speech can accompany ongoing physical work** and that **several different operations can appear in one reply**. No instruction asks for a thought, action, feeling, goal or explanation merely to complete a template. Examples used for documentation or checks are not pasted into every model request.

### 7.2 UI metadata versus necessary labels

Create an AI projection of installed request definitions at their current semantic owner. Keep the family ID, useful purpose, exact field meanings/types, real choices, units, deadlines, mode consequences and supported output/continuation facts. Exclude `presentation`, `submitLabel`, form widgets and duplicate field captions that add no semantic information. A label that explains a meaningful value stays in concise wording even if the UI also uses it.

The model receives one activity description, not a raw UI form. The human menu can continue using its richer presentation from the same installed definition. This does not authorize copying world laws into server constants or forcing another world to use bundled survival actions.

### 7.3 Exact name-to-ID mappings remain

The finalized manifest provides one authoritative request-owned mapping for every selected entity, possession, container item, remembered subject, action, known method and editable knowledge target. Required mappings are reserved before optional text. A schema enum of opaque tokens does not tell the model which token means Orin, the knife or the cache; useful labels remain mandatory.

Initially retain the existing **References** section and consolidate duplicated descriptions elsewhere. Later render an entity's handle alongside its primary description and omit its second reference row only after a mechanical coverage check proves the exact mapping and its necessary roles are still present. Inventory-only IDs and inspected container-item IDs must survive either layout. A raw entity's global name/position is never recovered merely to enrich that row.

Reference construction uses the exact selected permitted ID closure. Move the derivation into the existing entity-reference owner with structured identity inputs and collision resolution over that selected set; do not hash all world entities before selecting a few references. Retain existing observer/recognition/exposure semantics, including SPK's accepted stable-recognition target when implemented. Recognition does not grant a name, current location or unseen history. Handle text may vary when a legitimate request's selected set changes; the immutable server binding is the authority. Never accept a handle from a previous request just because its short text happens to match.

For collisions, compute each selected subject's complete digest from the unambiguous owning identity tuple, use the existing short-prefix policy, and lengthen colliding groups deterministically until distinct. Build the final table before schema compilation. If later selected dependencies add IDs, rebuild the table, rendered annotations and schema together; do not silently change already-dispatched handles. Whole-world collision enumeration and a new persisted alias registry are unnecessary.

Keep namespace distinctions explicit. Entity handles cannot be used as method/definition/source/goal identities merely because both are strings. Surface and authored-definition IDs retain their current dedicated binding until a selected alias is introduced through the same owner. A method output refers to its earlier submitted step's actual receipt, never an invented future entity token.

### 7.4 Numerical and spatial presentation

Preserve all actor-permitted current body measurements required by the existing body projection, with installed meanings, units and scale. Keep exact quantities and boundaries required to choose or execute an action. Deterministic human-oriented formatting may remove irrelevant floating-point representation noise only under the attribute/geometry owner's explicit display precision; canonical stored values and executable bindings remain exact. Do not independently round health, food, time or a near-threshold distance in the context formatter.

Do not enumerate every public support surface simply because it is public. Select the current support, supports of actually described/selected destinations, relevant transitions and the permitted discovery path. A direct coordinate choice still uses the spatial owner's canonical support/placement validation; a reference is not proof of reachability. The [spatial contract](../spatial-world.md#movement) owns frame, height, support and route meaning. If exact safe movement needs a support whose identity cannot be supplied or inspected, retain that detail now or preserve the owner's unavailable result. Do not infer hidden geometry or pretend an unexplored route is clear.

## 8. Detail access without a mandatory second generation

### 8.1 Selected first delivery

Use existing explicit native inspection and the ordinary unlisted-attempt path. Do not add a ninth response operation, a generic tool-calling loop or an automatic “retrieve then ask GPT again” sequence. Immediate generative levels retain their current zero tool-round allowance. The character may select a supported inspection as an actual action; its resulting permitted evidence can support a later ordinary decision under existing intake/admission. This is voluntary gameplay, not a hidden per-request tax.

An omitted optional detail must satisfy all of these conditions:

1. Its absence does not remove required meaning or a material urgent alternative.
2. The initial context retains the capability's useful meaning, so the character can recognize that the option exists.
3. A current exact permitted inspection action/continuation handle can obtain the relevant detail, or the available unlisted-attempt route can preserve the intended request without guessing a target or parameter.
4. The result's true scope, current availability, meaningful time/action consequence and coverage are understandable.
5. If no supported route can obtain the information when needed, the initial request includes the detail instead. A conceptual future inspection feature cannot justify deletion today.

Keep required information about an urgent alternative in the initial threat context. Requiring a character to inspect a weapon's known capabilities while being attacked is not an acceptable reduction. Likewise, known terms of an active agreement, currently held resources and an already inspected selected item do not become optional background just because they have dedicated readers.

### 8.2 Existing inspection contracts

| Existing source | Entry and returned meaning | Boundaries that remain |
| --- | --- | --- |
| Own possessions | Exact inventory inspection/continuation through `inspectPossessions` and `currentInventoryInspection`; selected current page plus known equipped/bound tools. | A page is not complete inventory. Later pages remain discoverable; stale custody/placement refuses the old selection. |
| Container contents | Deliberately selected permitted container inspection through `inspectedContainer`; exact page and item references. | Seeing the outer container, carrying it or listing a possession does not reveal nested contents or unread inscriptions. Every ancestor/access/inspection dependency is checked. |
| Action experience and learned activities | Existing actor inspection event and `activityHistoryForActor`, retaining action and method cursors. | Read only the actor's admitted evidence and learned definitions. A catalog entry does not grant learning, resources or action authority. |
| Unlisted action/qualifier | Existing `proposal` with exact available references and consequential slots; grounding may return information-needed/clarification/blocked/unsupported. | Preserve omitted requirements and unresolved intent. No fuzzy name lookup, silent invented target or automatic paid clarification. |
| Additional private memory | Existing direct assembly/recall queries; reflection tools remain at their current owner. | A new immediate memory tool still requires CR04's demonstrated-omission gate and CR08/CH01's separately bounded execution design. This project does not claim that such a tool exists. |

An inspection handle's binding retains actor/world/timeline/control, source/container/method identity, source/definition revision, cursor/query predicate, current access and the existing per-operation work allowance. Cursors are scoped exact continuations, not offsets into another actor's collection. A result after revocation, correction, restore or container movement must fail the current guard before disclosure. Exhaustion is partial/unavailable, not empty.

Paginating across several ordinary decisions does not create a free unbounded background scan. Each selected action uses its current native work limit; any later model call needs its ordinary admission. Existing uninterrupted work, source retention and pause/save semantics remain. Do not keep a provider session alive while the character walks, waits for someone or inspects a physical object.

### 8.3 Evidence gate for richer detail tools

If matched play demonstrates a necessary omitted fact that cannot be cheaply selected initially or reached through a useful ordinary inspection, record the exact miss: initial permitted sources, omitted item, failed decision, available retrieval path, latency/action burden and whether corrected initial selection resolves it. CR04/CR08/CH01 then own a separately admitted read-only within-job tool route. Its later design must bound cumulative calls, records, bytes, time and spending; count tool schemas/results; refresh changed dependencies; and deny raw SQL, arbitrary filesystem/world access or another actor's mind. Do not implement an unused tool registry now. This explicit gate does not postpone the required current-context fixes in SC01–SC11.

## 9. Compact response contract

### 9.1 Root and operation envelope

Retain one strict root object with `operations`, an ordered array under the existing `RESPONSE_LIMITS`. The array may be empty. A request-enabled invention envelope remains a separate existing root property only on routes that actually support it; do not add an empty invention property to every reply.

Each operation is a strict object containing exactly `localId`, `requiresAccepted`, and **one** of `talk`, `act`, `think`, `goal`, `plan`, `note`, `name`, `appraise`. The selected payload is nonnull. No inactive payload keys are declared or returned. All properties declared in that branch are required. Use `z.union`/nested JSON Schema `anyOf`, not a root union or a nullable object containing unrelated union alternatives. `additionalProperties: false` applies to every object. Native envelope validation must enforce the same actual structure, not require the old minimum key count or old null fields.

Common fields retain their existing meanings: `localId` is a unique request-local identifier matching the current supported grammar/length; `requiresAccepted` contains distinct earlier local IDs only. An empty dependency list permits independent admission. An earlier accepted operation is not proof that its physical work has finished. Later dependent operations are skipped with the existing dependency-refused outcome if the required earlier admission failed. Cycles, forward references, duplicate IDs and invented aliases are invalid. The native receipt keeps each component's actual disposition.

Use shared exported payload schemas for immediate operations, reflection and native preparation instead of introspecting `operationSchema.shape.note.unwrap()` after the envelope becomes a union. One payload owner may legitimately have a model-facing projection and a native command with server-bound metadata; neither is an old-wire-format reader. Update current producers/consumers in one coherent contract change, increment the existing cognition instruction/contract version, and retain no legacy adapter, version-suffixed alternate type or dual parser.

### 9.2 All eight operation kinds

The first sparse delivery retains meaningful existing revision fields. Section 10 specifies their later removal from model text/output while preserving the same native concurrency checks.

| Kind | Fields in its payload | Required meaning and genuine nulls |
| --- | --- | --- |
| `talk` | `text`, `addresseeEntityId`, `selfIntroduction`, `volume` | Exact utterance and permitted target; `selfIntroduction: null` means no introduction. Volume comes from the installed supported speech contract. Current immediate code requires a target; the coordinated SPK target permits an explicitly unaddressed utterance. Adopt that nullable target only with SPK's complete producer/hearing/admission contract, not as a schema-only shortcut. |
| `think` | `text`, `aboutEntityIds` | Brief fictional feeling/intention, with zero or more supplied entity references. No reasoning transcript, public speech, physical effect or fabricated accomplishment. |
| `act` | One action alternative from section 9.3 | Only fields belonging to the selected action kind. A known action may be an explicit continuation/inspection/control if its current binding supports that meaning. |
| `goal` | One goal alternative below | Private operational intention; create/revise/status meanings remain distinct. Completion changes the intention's status and grants no achievement/reward. |
| `plan` | One plan alternative below | Native finite frontier with its actual continuation/interruption semantics and output dependencies. No automatic inference between steps. |
| `note` | `subjectId`, `expectedRevision`, `text` | `subjectId: null` selects the general notepad; otherwise use a supplied entity/knowledge reference. Empty text follows the existing deliberate clearing semantics, not an omitted response. Respect the current knowledge policy and bound reference. |
| `name` | `subjectId`, `expectedRevision`, `givenName` | Assign/change the actor's own recognized label through the existing knowledge owner; no global rename or invented relationship. A currently unknown given name does not make the operation unavailable if the source identity is legitimately recognized. |
| `appraise` | One exact supported create/reframe/resolve alternative | Source-bound private interpretation under a decision-enabled installed definition; values and targets match that definition. No inference of another actor's private feelings. |

Goal alternatives are: create with `operation`, `objective`, nullable `parentId`; revise with `operation`, `goalId`, `expectedRevision`, `objective`, nullable `parentId`; and each of pause/resume/complete/abandon with only `operation`, `goalId`, `expectedRevision`. Do not make a status update include an empty objective/parent. Existing goal IDs and valid earlier-created `$localId` references retain their native meaning; use a new goal alias only with that earlier operation in `requiresAccepted`. Preserve the existing active/paused goal allowance.

Plan alternatives are: cancel with `mode: cancel` and `expectedRevision`; enqueue/replace/interrupt each with `mode`, `expectedRevision`, nullable `goalId`, and `steps`. Cancellation has no new steps or goal. Each step is either `{actionId}` or `{itemFromStep, useItemAs}`. `itemFromStep` must be an earlier zero-based index within this submitted frontier; `useItemAs` uses the currently supported equip/eat roles. A prior step must actually support one item output receipt of the required meaning. No array order, local goal dependency or proposed action creates a future item identity. Continuation consumes actual receipts, stops/reports failure through the agency owner, rechecks current prerequisites and does not replay already committed outputs after save/load.

Appraisal alternatives reuse `bindDecisionAppraisals`: create is exactly `{kind: create, definition, source, target, value}` with a nullable supported target; reframe is exactly `{kind: reframe, appraisal, source, value}`; resolve is exactly `{kind: resolve, appraisal}`. `value` is either `{kind: qualitative}` or `{kind: scaled, value}`. Bind each definition/existing feeling handle to its actual value kind and scale bounds; do not allow any definition alongside any numeric/qualitative branch. The source, target and appraisal fields use only their corresponding supplied exact bindings. Decision appraisal output already omits expected revisions: its current binder supplies captured record revisions. Preserve that precedent and its native source-cause rules; reflection's different payload is not a reason to repad decision output. A qualitative value contains no invented number; an unavailable feeling is not numeric zero. Appraisal remains absent only when the selected world/body/route genuinely provides no admitted decision appraisal, not because an optional relevance rule thought emotion unlikely.

### 9.3 Action alternatives

| `act.kind` | Declared fields | Consequential rules |
| --- | --- | --- |
| `known` | `kind`, `actionId`, `mode` | The handle selects the exact supplied binding, including purpose and work transition. Preserve distinct purposes sharing a first physical action. Do not replace a choice-specific mode with one global enqueue/replace flag. |
| `expression` | `kind`, `verb`, nullable `targetEntityId` | A supported gesture uses its actual body/target requirements and does not replace physical work. Do not retain an ignored work-mode field. The selected world's expression meanings remain at their existing definition owner. |
| `proposal` | `kind`, `description`, nullable `targetEntityId`, nullable `slots`, `mode` | Preserve complete intended wording and known exact references/amounts. Unsupported qualifiers route to fulfillment review, not an invocation that silently omits them. Unknown target/quantity stays unspecified; it does not authorize name guessing. |
| `invoke` | `kind`, `invocation`, `mode` | The invocation is one exact family-specific branch. No top-level unused action ID, gesture verb, description or target appears. Native binding and final admission still determine feasibility/effects. |

`slots`, when nonnull, retains its genuinely independently optional item, instrument, recipient, quantity/quantity mode, stopping time and method requirements. Their current typed owner and bounds remain; null means that the intention did not specify that slot. A nonnull quantity and quantity mode must form a valid pair, with exact handled quantity distinguished from desired total held afterward. Do not turn an omitted slot into permission to invent a resource or discard a qualifier. These meaningful nulls differ from seven unrelated operation payloads forced to null.

Direct invocation alternatives:

| Family/form | Declared invocation fields | Binding |
| --- | --- | --- |
| Move in world coordinates | `family: move`, `frame: world`, `x`, `z`, nullable `surfaceId` | X/Z are horizontal coordinates; use the existing spatial support/default rules. Never interpret Z as height or infer reachability from a coordinate. |
| Move relative to actor | `family: move`, `frame: actor`, `x`, `z`, nullable `surfaceId` | Offsets use the captured actor facing under the existing movement contract. Final binding checks the relevant pose/meaning; do not reinterpret an old relative instruction from a different facing silently. |
| Move to a perceived/remembered target place | `family: move`, `place: target` or `last-seen`, `targetEntityId` | Current visible location and exact last-seen evidence are different alternatives. No unused coordinates, relation or item fields. |
| Follow | `family: follow`, `targetEntityId`, nullable `distance`, `relation`, `onLost`, `until` | Null uses the existing family default only where supported. Keep selected distance/relation/lost-sight behavior and world-owned stopping-time semantics. Following grants no stealth and does not reveal hidden target movement. |
| Pickup | `family: pickup`, `targetEntityId`, nullable `itemId`, nullable `quantity` | Target is the exact permitted pile/container supported by the current family. Selecting a particular item or count cannot become “anything useful.” Null follows the family's existing whole-selection meaning and still needs its full admitted scope. |
| Drop | `family: drop`, `itemId`, nullable `quantity` | Exact possession; a whole-stack selection binds the observed intended stack/amount through the native owner and rejects a material stale change rather than silently adding newly acquired units. |
| Installed request | `family` equal to one installed request ID, `parameters` equal to that family's closed declared object | Build one branch per family, with exact field kinds/units/ranges/reference sets. A combat-help family cannot accept fire-watch parameters. No navigation fields appear. |

Avoid ambiguous overlapping move branches: require their defining frame/place literal and prohibit the other form's fields. Preserve current native fallback/default semantics only where the family owner explicitly supports them. This is a schema-shape change, not permission to extend placement, follow range, body reach, pickup or container knowledge.

The first sparse installed-request shape may retain its currently required mode parameter plus `act.mode`, with the existing equality check. The subsequent revision/metadata stage makes the selected work transition appear once: the request definition identifies the field that represents the same transition, the model supplies `act.mode`, and the native binder injects that identical value into the family input. Never remove an independent mode-like parameter merely because its type is an enum, and never change invocation behavior by accepting mismatched modes.

### 9.4 Same reply, simultaneous behavior

For an illustrative permitted scene where Orin and the cache have the supplied handles `2c7a` and `9b1e`, the sparse shape can be:

```json
{
  "operations": [
    {
      "localId": "speak",
      "requiresAccepted": [],
      "talk": {
        "text": "I'll check the supplies.",
        "addresseeEntityId": "2c7a",
        "selfIntroduction": null,
        "volume": "normal"
      }
    },
    {
      "localId": "walk",
      "requiresAccepted": [],
      "act": {
        "kind": "invoke",
        "mode": "enqueue",
        "invocation": {"family": "move", "place": "target", "targetEntityId": "9b1e"}
      }
    }
  ]
}
```

The handles and dialogue are illustrative; examples are not model inputs or implemented scene evidence. Speech can succeed while movement fails, and movement can succeed when an independent speech operation is refused. If the actor deliberately wants walking to depend on speech admission, `walk.requiresAccepted` can contain `speak`; that still does not wait for a physical activity to finish. Real sequential physical dependencies belong to native plan steps. The redesign must never reduce the root to exactly one action or make speaking cancel existing work.

### 9.5 `$ref` is a separate gated refinement

Sparse `anyOf` alternatives need no `$ref` support and ship first. The current local `compileSchema` rejects `$ref`, `$dynamicRef`, `$recursiveRef`, `$id` and `$async`; provider documentation permitting references does not make them usable in this repository. See the [dated provider evidence](situation-aware-cognition-context-evidence-and-decisions.md) for the external support and its limits.

If complete-schema measurements show worthwhile repeated entity/action definitions after sparsity, SC12 may enable **local, nonrecursive references within the captured schema only**. Resolve an exact `#/$defs/<escaped-key>` or the chosen equivalent single local namespace; reject external URI, missing target, cycle, dynamic/recursive reference and unsupported reference form before provider dispatch. Retain strict object/all-declared-properties checks when traversing referenced definitions, bound traversal by admitted schema nodes/bytes, and compile only the frozen captured schema. Memoize visited definitions for validation, not authority. Update every configured provider/preview path and exact schema validation before activation. Do not add an external schema loader or recursive grammar support merely because the vendor supports it.

This is a measured optimization gate, not an unresolved product choice: retain inline definitions if the net encoded/token/latency benefit is absent or the configured route cannot qualify the subset. Both outcomes preserve one current schema generator; no alternate old-format parser remains.

## 10. Later refinement: server-bound revisions and one work mode

SC12 removes revision echoing after the sparse contract and its consumers are qualified. This is a selected later stage within this project, not permission to weaken optimistic concurrency. The server already knows which exact revision it showed the character; asking the model to copy that number adds tokens and can create avoidable validation failures. Native mutation still receives and checks the exact expected revision.

### 10.1 Binding and model shape

Extend the existing prepared response binding with a read-only `revisionBindings` map keyed by the complete world/timeline/actor/record-kind/target identity. Each entry retains the expected revision, whether the target existed, required source/content coverage, and the owner's read dependencies. Use exact keys/typed records; an entity reference and a knowledge-document reference are different namespaces.

Remove `expectedRevision` from model-facing goal updates, plans, note edits and name edits. Remove model-only `noteRevision`, `nameRevision` and comparable fields from References when no remaining decision consumer needs them. Do not remove a meaningful current plan status, actual amount, time remaining or correction because it also has a revision. The server supplies native expected revisions from the retained binding immediately before each operation's existing mutation owner runs.

A full replacement of a nonempty knowledge note requires the exact current note text in that operation's prepared read set; a note's label/revision alone is insufficient to preserve information. A newly created/empty note instead requires a captured authoritative absence/empty state. The initial selector includes material relevant note text and keeps the note capability discoverable. An omitted nonempty document is not a prepared replacement target. Obtain its detail through a current supported route or a later properly prepared decision; do not invent an inspection API or silently replace unseen text. Independently permitted operations continue under their usual rules. The same principle applies to revising an unseen goal objective or naming an unresolved subject.

For absent targets, distinguish a captured known absence from a missing binding. Revision zero may represent the owner's current absent-record convention; it never means “ignore revision checks.” Creating a goal uses the native allocator and returns its actual ID in that component receipt; a model-provided `$localId` is only an accepted same-reply alias.

### 10.2 Same-reply write semantics

Maintain a small response-local table of the last **accepted** writer and resulting revision for each target. It is derived while the existing serialized response commit runs, not a persisted second state store. Apply these rules in operation order:

1. With no earlier accepted write to the target, compare its current owner revision with the captured binding. A mismatch refuses that component as stale; never reread the newest record and silently adopt it.
2. If an earlier accepted operation in this reply wrote that target, a later write may use the resulting revision only when `requiresAccepted` explicitly includes that last accepted writer's local ID. Otherwise the later write still expects the captured revision and is refused after the conflicting change.
3. A dependency on an older writer is insufficient if a later accepted write to the same target intervened. Require the current last writer, avoiding accidental overwrite of a sibling operation's accepted edit.
4. A failed/skipped writer changes neither the target nor the table. A dependent operation receives the existing dependency-rejected outcome; independent operations remain eligible.
5. Target creation through a valid earlier local alias uses the created ID/revision only with the required accepted dependency. No alias can refer to a future operation, another request, or a nonmatching receipt kind.
6. Read dependencies remain protected too. For example, a child goal depending on the displayed parent purpose must not silently bind a changed unrelated parent objective. Exact owner guards determine whether a changed record matters.

The native owner returns the affected target/revision information needed for this table as internal typed commit metadata. Do not infer mutation from text, increment revisions manually in a transport adapter, or assume every accepted operation writes the same record. Existing command/result facts, accounting and component receipts remain authoritative. A dependent write is based on an explicit prior proposed effect and its accepted receipt; no new model call is required.

Perform the model-to-native binding once at the existing admission boundary using the retained request. The native `ActorResponse`/command representation can include revision metadata the model never sees. This is a current trust-boundary projection with distinct responsibilities, not compatibility with the retired padded JSON shape. Update every current producer/parser/caller and the diagnostic schema label in that stage; no old schema remains accepted.

### 10.3 Transition mode appears once

For an installed request whose declared mode field is the same work transition as `act.mode`, derive that field from the single selected `act.mode` at native binding. Its installed definition explicitly identifies the shared role. Keep independent mode-like fields if their meanings differ. A known prepared choice's allowed transition remains part of the exact binding and must match the selected mode; no default overrides it.

This removes repeated form metadata without changing enqueue/replace/interrupt semantics. Qualification must show an exact replacement with lost work/resources, a legitimate temporary interruption with supported resumption, an independent social withdrawal that starts no physical work, and a mismatched unsupported transition refused before costs.

## 11. Complete request accounting and cache behavior

### 11.1 Measurements and existing limits

Current generative levels enforce a message/context byte allowance and a separate schema allowance; the transport additionally bounds its fully serialized request. They also have their own output/reasoning/request/spend controls. Keep their exact values, rationale and status in [the existing limits inventory](../limits/cognition.md#cg08), not a second independent constants table here. Immediate levels retain zero tool rounds. The existing conversation-compaction and source-preparation bounds remain at the SPK/memory/narration owners.

Produce the following measurements from the actual prepared request:

| Measurement | Definition |
| --- | --- |
| `instructionsBytes` | UTF-8 bytes of actual trusted system/developer instruction strings sent by the adapter. |
| `contextBytes` | UTF-8 bytes of the final model-facing facts, conditional guidance and reference text. |
| `schemaBytes` | UTF-8 bytes of the compact actual response schema passed to the adapter, including descriptions/enums/local definitions. |
| `toolDefinitionBytes` and `toolResultBytes` | Actual separately supplied tool definitions/results on a route that supports them; zero for immediate v1 cognition, not an implicit free allowance. |
| `transportBytes` | Bytes of the exact serialized provider request, including its wrapper, role/message structure and fields. This is the transport gate and is not itself a billed-token count. |
| `estimatedInputTokens` | An explicitly labeled estimate for the **complete** input, with estimator/model/version/basis; include schema/tool overhead conservatively or mark that component unavailable. Do not relabel prompt bytes divided by three as total measured usage. |
| `maxOutputTokens` and `visibleOutputBytes` | The actual selected provider output allowance and local output envelope limit. Reasoning tokens follow the configured adapter's reported semantics. |
| `providerUsage` | Actual input/output/cached-input/reasoning counts when supplied by a provider receipt, with missing/uncertain fields preserved. |
| `preparationWork` | Metadata/source rows visited, bytes hydrated/rendered, definitions compiled, references generated, exact native checks, cache results and elapsed/CPU work at each relevant stage. |

Avoid double counting: schema text included inside `transportBytes` is reported as a component of that total, not added to it again. Input text encoded twice by an adapter is real duplication to remove. Pretty-print indentation in an exported HTTP JSON view can inflate displayed lines without proving the same tokens were sent; stored message-string whitespace is different. The attachment measurements and all discussion decisions live in the [evidence record](situation-aware-cognition-context-evidence-and-decisions.md).

At final admission, satisfy the existing message, schema, serialized-body and selected model-context/output limits together. Do not raise one silently to accommodate duplicated content. Use the configured/pinned adapter capability, not assumptions about a newer model sharing a product name. Exact local provider tokenization may be unavailable; retain the conservative byte gates, disclose estimate limits and compare with actual provider receipts rather than purchasing a counting request automatically. `maxOutputTokens` controls potential output; lowering it does not remove input context and can create truncated replies.

Count all separately admitted work for the decision: semantic retrieval/query embeddings, attention, any existing optional summary, threat relevance/appraisal and choice, generation, interpretation and configured reconsideration. A smaller final GPT request can still be a more expensive pipeline if extra calls were added. A no-dispatch preparation refusal reports no generation spend but retains any already incurred preparation costs. Missing usage is not zero spending.

### 11.2 Stable prefix without stale meaning

Place the trusted shared instructions and genuinely stable selected-world semantics before actor-specific and current-event material where the configured adapter permits that arrangement. Keep schema names stable for a contract shape rather than embedding a job ID. Canonicalize only fields whose ordering is semantically irrelevant; preserve chronological evidence, operation order, action-choice insertion/tie semantics and selected priorities.

Cache eligibility depends on the actual provider-rendered prefix and applicable settings, including tools/schema where that adapter uses them. Per-request entity enums or capability sets can change the schema and prevent reuse even if the first system paragraph is identical. Record actual cached-input usage; do not promise a cache hit from rearranging prose. Dynamic context selection and provider prefix caching are distinct optimizations.

Keep request-scoped entity enums in the first delivery because they prevent invalid references before paid output arrives. A globally static unconstrained reference schema is not selected merely to improve caching. Shared local definitions can later reduce repeated enums without changing the exact permitted set. Measure whether prefix reuse outweighs schema variation on the actual selected model/route; never retain stale facts, drop needed alternatives or expose another character's context to obtain a larger cache hit.

### 11.3 All transport and generated-value paths

The same finalized model contract must reach direct OpenAI generation in `packages/ai/src/client.ts`, Macrofold direct generation in `packages/ai/src/macrofold-decision.ts`, any currently supported full-generation path in `apps/server/src/macrofold.ts`, native/fixture generated-value callers, decision reconsideration and the private first-speech parser. Their actual API wrapper names may differ; their semantic payload and binding do not. Do not copy an example from a later vendor API into the pinned adapter without checking its current request shape.

The package boundary already captures/freeze-validates a schema for local decoding. Retain those exact schema bytes across the provider wait and reuse them at final parse; a caller mutation cannot change what was requested. Diagnostics may project a compact summary, but an authorized exact request inspection must correspond to what was actually dispatched. Trace coverage must distinguish a prepared request, an accepted remote request, final output validation and committed operations.

The [dated provider research](situation-aware-cognition-context-evidence-and-decisions.md) supports nested closed alternatives, describes schema/tool input overhead and explains exact-prefix caching. It does not establish compatibility or savings for the configured OpenLegend route; actual adapter qualification remains required before activation.

## 12. Freshness, authority, publication and persistence

### 12.1 Boundary-by-boundary checks

| Boundary | Required retained/current checks |
| --- | --- |
| Before metadata/source selection | Actor/world/timeline/audience/control, permitted source family/query, body eligibility and current definition scope. |
| After asynchronous memory/inspection/relevance work | Source family/ID/revision, forgetting/correction/privacy, actor recognition/exposure and read scope; discard old text before any newly permitted disclosure. |
| Before paid generation | Complete finalized required closure, current actor/job/authority, latest permitted required-outcome boundary, exact schema/reference agreement, all size and spending gates. |
| Before first private speech preview | Complete talk-only operation under the final request schema, no admission dependency, exact permitted requesting addressee, current source attribution/hearing and request/control/timeline checks; applicable pre-display content checks remain required. |
| Before each native operation | Current actual prerequisite/authority, body/target life, installed definition, exact resource/consent/work transition and relevant revision/source binding. An earlier preview or relevance result grants no permission. |
| After commit | Record exact independent receipts/effects, accepted source cut and already committed costs; new personal outcomes enter the shared experience owner once. |

Distinguish invalidated evidence from newer additive evidence. Corrected/forgotten support, changed target identity/life, revoked authority or replaced work can invalidate dependent operations. Unrelated world changes do not. Current feasibility must be checked even when a retained historical observation remains valid. A later utterance or ordinary meter decay does not automatically make every in-flight response stale; apply the current route's meaningful-change/urgent-refresh policy and retain the original source time. Never claim the generated decision considered events after its captured cut.

The existing urgent-refresh/supersession owner decides when a genuinely material new cause replaces an in-flight decision. This design neither adds unlimited retries nor suppresses later assaults/action outcomes to protect a cache. The selected threat strategy's whole-job refresh and bounded concurrency are owned by CTR08. A native already released effect can continue even if its source dies or stops participating; that fact grants no new observation rights to the departed source.

### 12.2 Preview and independent operation safety

`previewSpeechOperation` must positively parse the exact talk branch, not merely check that a remembered list of other fields is null. In particular, the current helper's manually enumerated exclusion list omits `appraise`; the sparse closed talk branch must reject any second payload, including a feeling proposal. Validate `requiresAccepted` is empty and perform current listener-specific disclosure checks before exposing words. A partially parsed text property is insufficient until the complete independently valid operation is closed.

Keep the current backend preview private, provisional and absent from memories/world events/other listeners. Do not restore the retired world-first preview row. Failure, cancellation or stale scope withdraws provisional text; final admission emits at most one actual utterance through the ordinary speech owner. Native event/request/component identity reconciles it, not matching text. A preview never starts a walk, writes a note, accepts a goal or changes a feeling.

A later independent malformed/refused action cannot retroactively turn a committed permitted utterance into something unsaid. Conversely, no preview acceptance authorizes the final action. Validate root syntax/envelope integrity at the common boundary and report individual semantic/native refusals through existing component receipts. Retain distinct provider failure, refusal, invalid output, unavailability, uncertain completion, stale evidence and deliberate quiet continuation.

### 12.3 Save/load and reproducibility

Context units, selection graphs, rendered prompts, prepared reference maps and local cache entries are derived operational state. Do not serialize them into the authoritative world as a second mind. Persist only the existing accepted character/world/source state, durable request/accounting/receipt data and the minimum diagnostic manifest under their current owners. Follow the current data-format policy; no old-save reader or compatibility fixture is authorized.

Same-version save/load must retain accepted identity, goals/obligations, actual source-linked outcomes, method/output bindings, exact work progress and native random sequence. Rebuild derived selection/indexes against the restored world/source cut, without creation hooks, new rewards, new random draws or replayed paid calls. A restore changes timeline/authority generation, so an old in-flight result cannot publish even if its entity/source IDs recur. Current account grants and privacy overlays remain outside rewindable game state.

The selector uses no world RNG. With identical permitted source snapshot, installed policy, source-specific relevance results and configuration, its selected units/order/aliases/schema are deterministic. Future live model replies are not promised to reproduce; use recorded accepted decisions for native replay. A cached derived summary retains exact source coverage and becomes unavailable after a relevant correction/forgetting/restore, rather than silently feeding abandoned-future experience into the restored character.

If some operations already committed before failure or a separately admitted later stage failed, preserve those real effects and their costs. Do not replay speech, consume an item twice, recreate a method output or roll back a private feeling merely because later action generation did not finish. Unknown external completion retains the existing financial/execution uncertainty; context optimization adds no retry authority.

## 13. Performance and preparation work

The four design answers are:

| Question | Answer |
| --- | --- |
| What grows? | Admitted decisions per actor, nearby density, possessions, known methods/definitions, retained personal evidence, simultaneously required commitments/threat choices, and dependency fan-out. Multiplying actors × every world entity or definitions × every item × every target is the principal risk. |
| What preparation is shared? | Immutable installed definition meanings, actor-independent schema fragments, one actor/snapshot observation/access preparation, one memory read cache, exact source metadata, native tool prerequisites and physical checks shared by different purposes. |
| What invalidates reuse? | Actual definition/source/privacy/recognition/body/work/geometry/custody/authority dependencies, meaningful clock boundaries and timeline restore. A generic global world revision is insufficiently selective, while an unchanged outer object is insufficient proof of nested immutability. |
| How is the whole operation measured? | Through actual decision/inspection/generation-preparation/publication callers, with metadata rows, bodies/bytes, candidate/reference/definition/physical-check counts, cold/warm timing, retained memory, request usage and later admitted behavior. A formatter microbenchmark does not qualify the pipeline. |

The pure closure visits each admitted unit/edge at most once per closure pass; optional ordering operates on the already bounded candidate set. Source metadata estimates reject provably oversized complete construction before copies/string assembly. Do not use an input character ceiling as permission to build an arbitrarily large object first.

Address these concrete current growth points in their existing owners:

- Select permitted reference IDs before hashing/formatting them; no whole-world entity map for one small request.
- Select required possessions and a permitted inventory page before expanding the whole inventory. Keep equipped items and exact tools/ammunition already bound to current/paused work.
- Reuse target-independent native capability/equipment/recovery checks before evaluating remaining tool/target combinations. Distinct purposes can reuse one physical check but retain distinct semantic identities.
- Select complete source keys/sizes before cold SQL hydration; batch related permitted reads in one compatible snapshot and verify the actual database plan. A `LIMIT` on returned rows is not proof that the database did bounded work.
- Compile immutable installed request descriptions/schema fragments once per exact definition pin, then bind only the actor-specific references/choices needed now. Do not recompile a full family for each item or actor if its immutable meaning is identical.
- Keep public supports and learned methods paged/selected through existing query owners; a broad catalog's public status is not a reason to serialize it for every greeting.
- Diagnostics use counters/reason enums and bounded selected manifests first. Full private text is loaded only for an authorized explicit inspection; context logging does not create a second full transcript store per poll.

Use request-scoped reuse by default. A longer-lived cache needs an existing owner, explicit dependencies, bounded retention and disposal on source correction, grant/control changes and restore. Do not store another actor's private prepared text under a shared world-only key. Dynamic schema compilation caches, if justified, key the exact immutable schema digest and dialect, not merely its schema name. Missing invalidation coverage requires rebuilding, not a speculative cache.

Qualification compares the small quiet scene, ordinary busy conversation, mixed speech/threat, many simultaneous local actors, large possession/method sets, cold retained memory and a large irrelevant world separately. Increase unrelated distant entities while holding the selected local scene fixed; the selected request/reference work should remain independent of that irrelevant population. Increase genuinely relevant local density separately to expose necessary growth. Include uneven cooperation graphs, changed containers/definitions, clock-only meaningful changes and restore, rather than reporting only a warm idle snapshot.

No arbitrary new per-character fact count, personality excerpt length, fixed context profile count, tool quota or generic target-token number is introduced. Existing workload ceilings remain in the limits inventory. Savings are measured against matched requests; absolute latency/population targets retain their existing project owners and unqualified status. A timeout/exhausted query remains incomplete evidence.

## 14. Implementation stages and release gates

Detailed checkboxes/status belong in [SC01–SC12](../maintainers/cognition-context.md); this table defines order and integration boundaries.

| Stage / tasks | Required implementation | Gate before proceeding/activation |
| --- | --- | --- |
| 1. Capture and account — SC01 | Add the typed retained manifest at `prepareDecision`; include late appraisal/invention additions and complete request metrics; preserve existing behavior while making required/optional coverage inspectable. | The exact sent context/schema/reference binding agrees with the manifest on ordinary and reconsideration paths; no new paid call or whole-world disclosure. |
| 2. Remove mechanical repetition — SC03/SC04 | Remove duplicate activity catalog/UI metadata/manual; export shared payload schemas; implement sparse root/nested alternatives and native/current caller changes. | All enabled operation kinds and independent speech/action behavior pass through actual adapter serialization, parser, reference resolution, native admission and private preview. No old padded reader remains. |
| 3. Dynamic informed selection — SC02/SC05 | Add nonexclusive signals, required closure, short world-derived capability views, optional selection/diversity and exact existing inspection continuations. | Required sources and material urgent alternatives survive; mixed situations do not become a single exclusive prompt; unavailable optional data cannot become absence; cold/large-source boundaries are exercised. |
| 4. Complete provider and lifecycle integration — SC06/SC07/SC10 | Apply final accounting/prefix layout to every provider/reconsideration path; finish late-data, privacy, revision and preview guards; reconcile the persistent contracts and current implementation summaries. | Exact complete requests fit all applicable gates; current source/authority changes reject dependent publication, benign changes preserve valid preparation, and accounting remains correct under failures. |
| 5. Remove echoed metadata — selected SC12 revision work | Bind model-free expected revisions, same-reply dependent writes and duplicate installed-request mode through section 10. Update current shapes/consumers together. | Same-target independent writes refuse, explicitly dependent writes succeed using actual accepted revisions, unseen note replacement is unavailable, and stale external edits cannot be overwritten. |
| 6. Performance and character qualification — SC08/SC09/SC11 | Compare matched representative snapshots and ordinary complete gameplay episodes; qualify all configured production paths and documented failure modes. | Clear request/preparation savings without a required-context regression; independent informed behavior, uncertainty, creative opportunities and actual gameplay consequences are assessed separately from structural validity. |
| Conditional refinement — SC12 local references | Enable the bounded local nonrecursive schema-reference subset only if the measured duplication and actual configured adapters justify it. Otherwise record the supported inline result. | Same semantic schema/coverage with a net measured benefit and provider/local/preview qualification; no external schema resolution or fallback paid call. |

Each stage is an end-to-end change to the current contract, not two production versions kept for backward compatibility. For a running deployment, use the existing job/cancellation/receipt owner to stop admitting old-contract work and fence its uncommitted results before enabling the new contract; preserve accepted effects and unresolved real spending. Do not wait indefinitely for remote cancellation or replay an interrupted call. Fresh current-format development state is allowed only under the root development policy; same-version restore remains required.

Use previous-revision disposable checkouts or captured permitted fixtures for comparisons. Do not leave an old runtime implementation solely for comparison. An unpaid shadow compilation may compare selected manifests during controlled verification; it must not make an extra model call, mutate a character, consume world randomness or become a second authority. No production rollout or paid evaluation is authorized by this documentation-only task.

### 14.1 Cross-project coordination

| Existing owner | What this design supplies; what remains there |
| --- | --- |
| CR01/CR03/CR04 | Complete compact preparation, metadata separation and required/optional source coverage. Existing retrieval/scoping/attention owners remain; this design does not create another memory selector. |
| CR08/CH01 | Existing explicit inspection and evidence for an omitted-detail problem. New multi-turn private recall/planning remains behind its existing demonstrated-need and execution gates. |
| SPK | Shared structured permitted speech/experience, source-linked summaries, stable recognition and membership-free exchange context through the same preparation. Its accepted contracts replace current group/episode assumptions when implemented; compact wording cannot weaken them. |
| CTR05–CTR08 | Complete actor-permitted threat snapshot and preserved exact purpose/action bindings. Keep the selected threat route's mandatory relevance/appraisal stage followed by independent choice; do not add that route to every ordinary greeting or remove either stage to save tokens. |
| CE03/CE05/CR12/AG12 | Context that preserves individual voice, actual needs, meaningful positive/negative/ambivalent experience, independent choices and later consequences. These owners retain full character-quality and enjoyment acceptance; schema checks do not close them. |
| Existing action/identity/save/provider owners | Current authority, exact references, physical outcomes, continuation and real accounting. Only the context representation and explicitly selected revision projection change here. |

CTR's stage-one accepted appraisal is deliberately included in stage two's postcommit snapshot. Refresh only that job's proven changed dependencies; retain original cause/source/privacy guards. Its own consumed appraisal receipt must not retrigger the same pipeline, while a later real blow, withdrawal or physical result remains new evidence. Ordinary context selection must not trim a complete-required strategy set or convert unavailable relevance into deliberate nonviolence. Broader noncombat route behavior stays at its existing owner.

## 15. Acceptance scenarios and implementation checklist

The following are required observable cases, not evidence that they have run. Prefer existing focused fixtures, caller scenarios and actual provider smoke paths under repository verification policy; add a focused regression test only where needed to protect a consequential uncovered contract. Do not write a suite that merely reproduces formatter output or impose unrequested broad testing on unrelated systems.

### 15.1 Context coverage and privacy

| Case | Required result |
| --- | --- |
| Watchpost-style arrival with identity, supplies, Orin, animals and no currently relevant fire activity | Full accepted identity/body/goals and the actual arrival/source/outcome meaning survive; exact references remain. The repeated activity catalog and UI form metadata appear zero times as duplicates. A visible wolf is not automatically labeled an attacker; a materially relevant remembered fire or promise would reactivate its necessary detail. |
| Ordinary directed greeting while an actor carries out chosen work | Actual current utterance and useful exchange, personality, current purpose and meaningful needs remain; unrelated detailed method/form manuals are absent. The character can speak while retaining work or choose a warranted independent change. |
| Warning and physical assault in the same admitted causes | Social, threat, body, work and relevant material/feeling sources are unioned; neither a last-event speech template nor an all-combat persona replaces them. |
| Required feeling lies beyond the convenience projection's first page | Exact required subject/source lookup or continued pages obtains it; zero/absence is never fabricated. Incomplete required lookup defers the affected strategy. |
| Partial inventory with useful equipment outside the ordinary page | Already-bound/equipped tools survive through exact lookups; optional unsearched stock is explicitly incomplete and remains inspectable. No “I have none” claim comes from the first page. |
| Visible bag with hidden contents or unread inscription | Outer description grants no contents/text. A deliberately permitted inspected page exposes only its exact items/text, with correct provenance and nested/access restrictions. |
| Two same-named actors, unseen remembered speaker, or changed exposure | Exact permitted mappings/roles are preserved without fuzzy matching; history does not disclose hidden current position or upgrade recognition outside its owner. |
| Same source ID in observation and another record family | Required checks/hydration use complete keys; one family's supplied source does not accidentally satisfy, overwrite or revoke the other. |
| Two optional choices share a tool/reference, and one optional dependency cycle is removed for size | Retained choices keep every shared dependency; a required root is never removed; an unsupported optional cycle is removed completely. Encoded accounting changes without rebuilding every complete prompt prefix or rereading source bodies. |
| Contradictory testimony, corrected source and an ambiguous “yes” | Preserve attribution/contradiction or explicit ambiguity; no summary converts it to verified agreement or consensus. |
| Optional retrieval/compaction unavailable or index lagging | Required evidence remains; actual partial coverage is truthful; no full dump, fabricated empty result or automatic paid retry. |
| Required identity/source/reference closure over budget | Refuse affected dispatch before optional paid work where overflow is already provable; no truncation. The actor's current native work and unrelated world simulation continue. |
| Hidden distant entities or another actor's private notes are changed | A request with the same permitted selected evidence remains unchanged; private data influences neither snippets, counts, relevance ranks nor handle collision preparation. |

### 15.2 Structured response and admission

| Case | Required result |
| --- | --- |
| Empty operations | Valid deliberate continuation; no forced thought, action, goal, appraisal or speech. Distinguish it from invalid/unavailable output. |
| Repeated talk/think operations plus one action | All supported entries remain independently admissible in order; speech and action can coexist; physical completion is not inferred from a preceding entry. |
| Two payload keys in one entry, including talk plus appraise | Rejected by both the strict provider/local contract and preview parser; no provisional leakage. |
| Every enabled kind and legitimate null | Talk introduction, general note target, untargeted supported appraisal, optional proposal slot and supported navigation default retain their meanings. No unused operation/variant null fields are generated. |
| Known action when no shortlist exists | No fabricated action handle. Generic supported invocation, goal changes and open proposals remain available under their actual route rules. |
| Installed family paired with another family's fields | Structurally invalid before native admission; native definition/reference/prerequisite checks remain in force. |
| Same physical action with two purposes or work modes | Both distinct choices retain exact purpose/control consequences; their shared physical preparation does not collapse semantic identity. |
| Native plan uses earlier produced item | Wait for actual earlier completion and exact supported output receipt; reject a forward index, missing output, wrong role or invented future item ID. Restore continues once without replaying production. |
| Goal create followed by plan using `$localId` | Requires the accepted earlier goal dependency. Status changes contain no irrelevant objective, cancellation no steps, and `interrupt` remains a valid supported plan mode. |
| Known/proposal/invoked action fails after independent speech | Preserve actual admitted speech and truthful failed action receipt; no imaginary completed work or paid repair. |
| Stale goal/note/name/plan revision | Refuse the affected edit. After SC12, server-bound revisions yield the same outcome without model echo. Explicit same-reply dependencies use actual accepted writer revisions; independent sibling writes do not silently overwrite. |
| Preview starts before later payload completes, followed by cancellation/revocation | No text before a complete valid talk operation and required output/disclosure checks; later cancellation withdraws provisional text and creates no world memory. |
| Local schema reference refinement | Missing/external/cyclic reference rejects locally before dispatch; admitted local definitions yield the same allowed outputs, references and privacy as inline schema. |

### 15.3 Fun, informed choice and complete cost

Run matched whole episodes through the existing [compelling-character evaluation](compelling-characters-feature-spec.md#production-route-and-creative-comparisons), keeping required identity, source conditions, actual available actions and provider settings fixed. Do not grade against one desired action. A grounded refusal, hesitation, joke, curious detour, offer of help or continued solitary work can all be valid if supported by the actor's perspective and actual constraints.

Required contrasts include a practical supply decision; a social request while busy; an inviting optional discovery; a pleasant or playful encounter; a private concern conflicting with the immediate goal; a mistaken belief challenged by new evidence; a sudden danger; and a later choice reflecting an earlier accepted experience. Include the ordinary route an NPC could take without the optional mechanic, so extra inspection/reading is not mistaken for a richer experience by itself.

Assess separately:

- Whether the context contained every declared required source and material alternative.
- Whether the character understood quantities, people, timing, uncertainty and work consequences.
- Whether the character retained its own voice, autonomy and a range of supported practical/noninstrumental options.
- Whether an actual later action/conversation changed meaningfully, rather than only producing a fluent private sentence.
- End-to-end response and preparation latency, refusal/defer rate, input/output/cached tokens, all auxiliary calls and real/uncertain cost.
- Human-assessed readability, distinctiveness and uncoached enjoyment. Engineer judgment or fixture success cannot close this gate.

A quality miss must record which required or optional source/meaning was missing, why selection omitted it and whether initial selection or a useful inspection fixes it. Prefer correcting the source/selection/description at its owner to expanding every prompt or adding another model. Record contrary examples, invalid responses and unfinished calls; do not select only the successful run. Paid qualification requires the existing account-owner authorization and task cap and is not performed by this design-only work.

## 16. Decisions and remaining uncertainty

**Selected design decisions:** one deterministic actor-scoped preparation/manifest; nonexclusive situation signals; complete required meaning and dependency closure; distinct partial/unavailable/absent states; full accepted About me; optional broad opportunities; compact descriptions from installed meanings; preserved References; sparse eight-kind operation arrays with shared semantic ownership; no mandatory new tool/model round; exact current reference enums first; later explicit server-bound revision/mode removal; and evidence-gated local-only schema references.

**Open owner decisions needed to start the specified implementation: none.** The conditional schema-reference gate has an explicit default: retain inline definitions when evidence/support does not justify activation. New multi-turn recall tools remain at their existing demonstrated-need owner and are not required to implement this scope. This design does not answer unrelated world-policy tuning, model choice, companion-release eligibility or broader population/economics questions.

**Unmeasured acceptance:** actual schema-dialect compatibility on every configured route; token/cache/latency savings; cold/large-world preparation cost; stale/privacy/save integration; and character quality/enjoyment. These are required implementation/qualification work, not completed findings or excuses to omit context. Design completion does not mark SC runtime tasks, CR12, CE05, SPK or CTR acceptance complete.

## Maintained records

- Implementation and unsatisfied acceptance: [SC01–SC12](../maintainers/cognition-context.md).
- Numerical, behavioral and removed/no-limit choices: [Cognition limits](../limits/cognition.md).
- Product scope and playable scenarios: [Feature specification](situation-aware-cognition-context-feature-spec.md).
- Shared contracts: [Memory](../memory-architecture.md), [action capabilities](../action-capabilities.md), [identity/references](../identity-and-references.md), [provider execution](../ai-providers.md), and [save/load](../save-and-load.md).
