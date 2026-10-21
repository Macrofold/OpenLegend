# Situation-aware cognition context: feature specification

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | Design complete. Runtime implementation and qualification have not started. | 2026-10-19 |

## 1. Purpose and intended experience

Give each character decision the information that matters to that person in that situation, expressed once, with enough meaning to choose intelligently. Remove duplicated catalogs, inactive response fields, irrelevant procedural detail and unnecessary preparation work. Preserve every required piece of actor-permitted evidence and every dependency needed to understand the situation or make a supported choice.

The goal is a more responsive and sustainable OpenLegend whose people still surprise the player for understandable reasons. A companion can recognize an ingenious use for an ordinary possession, keep working while answering a question, refuse one request while offering useful help, remember why a cheap object matters, or choose an enjoyable detour after the urgent work is done. Compression fails if it makes everyone narrowly pursue the current task, forget meaningful consequences or use only the first suggested action.

The [gameplay priority policy](../repertoires/gameplay-priorities.md) remains controlling: the first worthwhile game combines survival, useful making, a defensible home, exploration, actual danger and progression with practical invention, independent people and persistent consequences. This project supports that complete experience. It does not promote all repertoire proposals into the starting world, turn every scene into a threat response, or replace playable opposition with an administrative demonstration.

**Selected target, not delivered behavior.** The inspected source is `main` at `0b1262a597ca718be54c287eea0619b073952f32`. The [technical design](situation-aware-cognition-context-tech-design.md) owns the implementation contract. The [evidence and decision record](situation-aware-cognition-context-evidence-and-decisions.md) preserves the supplied request, measurement method, source findings, alternatives and conversation decisions. [SC01–SC12](../maintainers/cognition-context.md) tracks delivery; this design task does not implement or qualify runtime behavior.

## 2. Decisions resolved by this conversation

| Question | Selected answer | Consequence for implementation |
| --- | --- | --- |
| Can a character speak and act together? | Yes. A reply may contain multiple independent operations, including repeated kinds. A person can also speak during compatible ongoing work. | Compact each operation; preserve the operations array, ordering, dependency semantics and native compatibility checks. Starting speech alone does not finish or cancel work. |
| Why have a long `## Response format` manual and a formal schema? | The schema owns structure. Keep concise semantic guidance for meanings the schema cannot establish; remove the duplicate field-by-field manual. | Generate structural constraints from one definition. Explain admission versus completion, continuing work, subjective goals, interruption, references and silence once. |
| Does removing UI labels mean deleting References? | No. References is a necessary mapping from permitted names/descriptions to exact request-scoped IDs. Some supplied inventory IDs occur only there. | Retain a complete mapping for all included/usable references. Remove form layout and button metadata only when its meaning is available elsewhere. |
| Is every nonempty field necessary? | No. A current choice needs material facts, methods, constraints and useful possibilities; it does not need every installed form or stored record. | Separate required evidence, conditionally needed detail, optional discovery and server-only metadata. A size target cannot override required evidence. |
| Should context depend on a single situation category? | No. Speech, ongoing work, danger, affection and curiosity can coexist. | Combine independently supported situation signals and their dependencies. Do not let a winning label hide the others. |
| Should the model first ask another model what it needs? | No new mandatory planning, summarizing or detail-generation call is selected. | Reuse current native discovery, existing attention and routing, and explicit inspection. Preserve the independently selected threat route's two stages. |
| Can accepted identity be summarized to meet a tiny greeting target? | No identity-projection change is selected. Preserve the complete accepted About me under its existing contract. | Remove surrounding duplication first. A large required identity may still produce a large request or explicit overflow. D55/CG09 retains any separate future identity decision. |
| Is a shorter request sufficient evidence of success? | No. Correct information, useful independent choices, playability and complete operating cost all matter. | Qualify mechanics, disclosure, model decisions, whole episodes and later return separately from byte counts. |

These decisions also apply to debugging output, previews and all current consumers of the response contract. They are not promises that every operation can physically execute simultaneously. Particular activities and bodies still own compatibility, resources, timing and interruption.

## 3. What counts as necessary context

Necessary context is information the character is entitled to use whose omission would materially change understanding of the present situation, the available supported means, their meaningful consequences, a relevant personal stake, or the validity of a proposed operation. It includes reasons to do something unexpected or pleasant. It is broader than the latest trigger, the current goal, urgency or the candidate action with the highest rating.

The contract is actor-relative. The character needs what they perceived, legitimately learned, remember or currently experience. A world fact hidden from that person is not missing context to be supplied by an optimizer. Someone else's statement is evidence that they made that statement; its content is not automatically objective truth. A partial search is not knowledge that nothing else exists.

There are two distinct obligations:

1. **Enforced completeness:** all declared required sources, current obligations and their interpretation/execution dependencies must survive preparation, rendering and dispatch. This can and must be checked mechanically. A missing required read or oversized required set prevents that affected generation; it never authorizes silent truncation.
2. **Open-ended relevance:** the system must discover and consider supported alternatives, quiet interests, contradictory evidence and useful associations beyond a narrow task match. No finite heuristic proves it found every possible creative connection. Record coverage honestly, preserve accessible inspection and unlisted attempts, and treat demonstrated consequential omissions as defects to correct in the existing discovery/selection owner.

This distinction is not an exemption from the user's requirement. It is how implementation avoids falsely declaring a heuristic shortlist complete. In particular, an implementation must not label all unselected facts unnecessary merely because they received a low score or were never examined.

### 3.1 Required information

The existing [memory contract](../memory-architecture.md#3-one-compact-model-facing-context), [structured permitted experience](../memory-architecture.md#structured-permitted-experience), [identity contract](../identity-and-references.md#contract) and route-specific owners remain authoritative. Within their scope, protect:

- The complete accepted About me and applicable trusted behavior/authority instructions. Preserve the person rather than a few matching traits or a script predicting a preferred reaction.
- The actual initiating stimulus, independently required coalesced causes, current addressed speech and its permitted speaker/audience/sequence. A delayed trigger retains its historical time and is not a fresh command to repeat an old reply.
- Current chosen purposes, relevant promises, active and interrupted work, supported stopping/resumption choices, required personal outcomes and unresolved consequential results. A completed task and a failed task must not be compressed into the same generic recent activity.
- Current bodily and psychological facts required by the present situation and installed policy, with meaningful conditions, uncertainty and units. Threat decisions retain the applicable appraisal evidence and action constraints; ordinary pleasure is not suppressed by an invented urgency policy.
- Evidence needed to understand a selected source: attribution, meaningful timing, quantity, participant roles, corrections, contradictions, withdrawals, known restrictions and relevant competing uses of a resource. A fond memory cannot overwrite a later request to stop.
- The known material properties, supported methods, costs, prerequisites, risks and exact parameters needed to choose or execute a currently relevant capability. Preserve alternatives that could reasonably change the choice, including retreat, asking, delaying, refusing, continuing, substituting and proposing another supported use.
- Exact request-owned references for selected people, possessions, places, methods, activities, sources or operations wherever the output or instructions use them. A readable name never becomes an ID lookup rule.
- Meaningful negative or incomplete facts, such as no current work, an empty *inspected* container, an unavailable memory search or only part of a large inventory being shown, when that distinction affects the decision.

Required does not mean repeat every source's full storage envelope. A structured event may have one faithful concise account with all relevant roles and qualifiers. Exact quoted speech stays exact when the source supplies it and the current contract requires it. A rendered sentence does not replace the retained structured source or create a new remembered event.

### 3.2 Information that may be reduced or absent

Duplicate descriptions of the same source can become one account carrying all its roles. Repeated ordinary terrain can use a faithful shared description while preserving distinct obstacles, cover, exits and unusual properties. Empty scaffolding can disappear when no absence needs explaining. Unrelated full action forms, distant unobserved state, irrelevant technical clocks, storage IDs and UI layout metadata need not enter the model request.

An optional description may be abbreviated only through a defined meaning-preserving representation. Unknown free-form prose cannot be cut at an arbitrary character boundary and called equivalent. A description of a tool's shape, material or history can be the clue to an unlisted use; remove duplication before removing that useful information. Precision reduction uses the existing display-precision owner and retains exact values where an installed threshold, quantity, deadline or parameter requires them.

Catalogue priority is **never** a runtime attention score. The repertoire's Core/Complete/Depth/Detail/Specialist labels order possible product work. An already enabled specialist rule, a Detail-ranked keepsake or an ordinary old observation may be necessary in the current world. Applicability and permitted current meaning govern context; implementation priority does not.

## 4. How a decision is prepared

The server produces a small, coherent decision view using existing semantic owners. The model does not receive the context compiler, its full candidate inventory, these design documents or the repertoire library.

1. Capture one permitted decision boundary: who is deciding, what happened, the current evidence/identity/work revisions and applicable world definitions.
2. Collect required facts and independent situation signals through existing perception, conversation, goals, work, memory and capability owners. Preserve deterministic discovery/fallback coverage; a discovery baseline does not require fully rendering every baseline row.
3. Close the required dependency set and establish its earliest reliable size bounds, including mandatory instructions, references and response structure. Refuse a provably oversized or unavailable required set before optional hydration, attention or compaction can spend more work or money. A selected object needs its permitted identity; an offered activity needs the meaning and exact form needed now; a recalled agreement needs material terms and relevant withdrawal or correction.
4. Discover relevant optional sources using scoped indexed/native queries and existing attention, then add each selected source's complete dependencies. Consider the current goal alongside other concerns, personal interests, recent consequences, alternative uses and quiet opportunities. Prefer selecting IDs and size metadata before loading large record bodies. Required context that cannot be measured until hydration is checked as soon as that read completes, again before optional paid work.
5. Render each meaning once at its smallest adequate representation. Assemble the matching compact response schema and exact References map from that same selection.
6. Account for the complete request before dispatch, including later appraisal/invention additions and schema/tool definitions. If the required set does not fit, use the explicit failure behavior in §10. Do not trim required context or silently drop a schema branch necessary for the decision.
7. Retain the selected-source manifest and bindings through generation. Revalidate affected evidence, permissions and execution prerequisites through their existing owners before preview/disclosure or admission. Record what was included, what was not examined and why, without exposing private diagnostic data to ordinary players.

Only a complete query over a stated permitted scope can establish absence in that scope. A partial, not-requested, unavailable, stale or forbidden result cannot. Stale or forbidden text cannot be retained as a useful snippet; an explanation of missing information must itself be permitted. The [technical design](situation-aware-cognition-context-tech-design.md) specifies data types, ordering, admission, lifecycle, algorithms and callers. This sequence is a coordinated use of existing owners, not a second memory system or a new agent framework.

## 5. Dynamic situations and information needs

These are representative combinations, not mutually exclusive modes or keyword rules. Installed world capabilities determine actual meanings. Signal collection does not decide what the person should choose.

| Situation or concurrent concern | Information that can become necessary | Detail usually unnecessary unless another signal needs it |
| --- | --- | --- |
| A short greeting during ordinary life | Who addressed whom, exact current speech, relevant relationship/recognition, accepted identity, current work and any immediate personal or bodily concern. | Full recipes, every optional group-activity form, exhaustive navigation catalogs. |
| Conversation while carrying or crafting | Current work, actual remaining commitment, compatibility and interruption meaning, relevant speaker/audience/history and the question being answered. | Forms for unrelated activities; repeated instructions implying speech requires idleness. |
| A request involving a promise or shared project | Actual terms, participants, contributed resources, current consent, amendments/withdrawals, what really happened, personal stakes and useful alternatives. | Whole faction history or a generic friendship score as a substitute for the relevant issue. |
| Immediate threat during another activity | Actor-perceived contact, current capabilities/injury/recovery, space/cover/exits, ongoing work, relevant feelings and commitments, and the selected threat-route context. | A universal fight-or-flight script; unrelated forms; secret opponent intent. |
| Travel, exploration or choosing a destination | Known routes, permitted destinations and landmarks, actual hazards/access, resources, companions' known purposes and discoveries worth noticing. | Every ground patch serialized separately when one description preserves the same navigable meaning. |
| Known manufacture or repair | Exact known method, required quantities/tools/conditions, current holdings and custody, availability, ongoing work and relevant tradeoffs. | Full forms for every known recipe or properties irrelevant to any current distinction. |
| Improvisation or a blocked method | The concrete problem, observed properties and existing skills, useful alternative materials/means, costs and access limits, and the open proposal/inspection route. | A prewritten clever answer; an assumption that only inputs from the original recipe are worth showing. |
| A puzzling new observation | The observation and uncertainty, source-specific related or contrary evidence, legitimate old clues and available investigation methods. | An omniscient solution or a generated past that explains the puzzle. |
| Leisure, affection or a quiet opportunity | Actual occasion, relevant taste/history/company, bodily readiness, competing commitments, and meaningful completion of prior needs/work. | Compulsory productivity, danger or reward justification for pleasure. |
| A new purpose emerges | The perceived possibility and personal connection that can make it matter, actual means and constraints, and present commitments it may compete with. | A pre-existing matching goal as a prerequisite for noticing the opportunity. |
| An object has practical and personal value | Current properties/condition/custody, relevant provenance and the person's actual association, known competing uses and current preferences. | A full chronicle, market price as the only value, or someone else's private attachment. |
| Inspection or missing detail | What is known, what is partial/uninspected, exact permitted query/target, its available result and any real action cost. | Claims that omitted things are absent or that every inspection is free and instantaneous. |

Signals combine. During a threat, a person may still care about a companion or a valued tool, know a workplace exit, call for help and continue an already chosen escape. During peaceful work, a joke may matter and speaking may be compatible. A quiet scene has no requirement to produce a new goal, speech or reflection.

The separately selected CTR native threat strategy retains the complete eligible purpose/action set for its required relevance/appraisal call, then the relevant and uncertain exact instances for independent choice. Ordinary optional fit/ranking cannot trim that required set. Its second call selects one already bound native response or composition; it does not use the new generative operation schema to invent additional actions. Speech plus action on that route requires an actually supported compatible composition, with no third speech generator. Other ordinary routes retain their existing call structure.

## 6. Capability discovery without hiding possibilities

### 6.1 One source of capability meaning

Installed capability definitions supply semantic purpose, supported modes, relevant parameter meanings, units, conditions, costs and consequences. Their UI projection supplies form layout, presentation choices and button captions. Their model projection supplies concise meaning and the exact currently useful invocation contract. The projections share meaning; they need not share identical serialization.

Remove a `presentation`, `submitLabel` or `purposeLabel` value from a model request only when it contributes no unique meaning. A mode label such as the distinction between joining and leaving, or a field label that explains what a quantity measures, may be essential. Move that meaning into the semantic owner before excluding its UI representation. This is a field-by-field decision, not a blanket ban on anything called a label.

The duplicate installed activity-request catalog in the supplied request should have one model projection. Preserve the separate situation-specific choices. A list of template definitions and the exact people/materials presently available are different information, even when they use the same activity names.

### 6.2 Detail levels

| Representation | When it is allowed | Required property |
| --- | --- | --- |
| Full useful invocation detail | The capability is relevant and may be chosen now, or delay would materially affect the decision. | Meaning, current parameters/references and relevant limitations are available without an extra information round. |
| Concise discovery description | A known capability is worth making discoverable, but its full form is not currently necessary. | The model can understand what it is for and has an actual exact inspection route to obtain needed detail. The description does not pretend to be executable parameters. |
| No per-capability detail | The capability is unrelated to the present decision and existing discovery/open-attempt routes remain adequate. | Omission does not revoke permission, erase known competence or claim the capability is unavailable. Coverage remains honest. |

Initial delivery uses existing native inspection and the existing unlisted/proposed-action path. It adds no generic model tool loop, ninth response operation, automatic second generation or mandatory search before every action. A character can choose an inspection through the normal action/experience path; its actual timing, evidence, spending and possible next decision remain with those owners.

If a useful detail cannot be obtained through an available inspection route, keep it in the initial relevant context. Do the same when requiring inspection would create an avoidable tactical disadvantage or turn ordinary play into repeated menu queries. A potential later read-only model detail tool is conditional on demonstrated omissions or excessive inspection friction; it needs its own scoped contract and qualification. ND20's richer-memory comparison remains conditional and selects no external memory dependency here.

### 6.3 Open attempts and authority

Suggested actions are incomplete assistance. The person can propose another supported use, ask a question, decline, remain silent or continue native work. A novel proposal still goes through the existing grounding/invention/admission owners; a short description cannot install arbitrary behavior or guarantee success. The selector must not call an action impossible solely because its full form was not included.

Conversely, discoverability cannot disclose hidden capabilities, recipes, locations, private motives or container contents. The character's actual knowledge and installed world laws determine what can be described. A remembered person can be referenced as remembered without becoming a currently reachable physical target.

## 7. Compact responses and essential instructions

The selected response still has an `operations` array. Each entry contains only common operation metadata and one active payload: `appraise`, `talk`, `act`, `think`, `goal`, `plan`, `note` or `name`. Preserve meaningful null values within an active operation where they actually express a choice. Remove the seven inactive sibling payloads that currently pad each of eight variants.

Use one authoritative schema/contract definition with a closed alternative for each valid shape. Family and parameter shape belong together: a request for one activity family must not structurally accept another family's parameters. Keep required fields of the chosen alternative required. Native validation still checks actor capabilities, current state, references, resources, permissions and cross-operation dependencies. A schema is not execution authority.

Do not select a talk-only response shape just because the latest trigger is speech. A greeting can occur during useful work or a new hazard. Shape specialization may remove an operation only when the established route/capability contract makes it unavailable for that whole decision, not when a classifier predicts it is unlikely. Empty `operations` remains a legitimate choice where the existing route permits it.

The remaining short semantic guidance must explain:

- An operation is a proposal; acceptance is not proof of physical completion or that a promise has been fulfilled.
- Multiple operations and repeated kinds are permitted within the existing response bounds. Speech can accompany compatible action/ongoing work. Dependencies express admission conditions, not a claim that an earlier physical action already finished.
- Continuing, pausing, canceling, replacing and interrupting work have different meanings. Preserve all supported plan modes, including `interrupt`.
- A goal expresses the person's chosen purpose and its completion judgment; it is not an instruction to manufacture the desired outcome. No obligatory thought, emotion explanation, goal rewrite or relationship update is introduced.
- Use supplied permitted references exactly. Do not infer an ID from a name or claim that a historical reference is currently visible/reachable.
- Unknown or incomplete evidence remains unknown/incomplete; silence, refusal, clarification and explicit inspection are available when appropriate.

Field names, null-padding examples and every enum do not need to be repeated in a prose manual. Necessary semantics may live in concise schema descriptions or shared instructions, but should have one maintained owner. Measure their combined size; moving a manual into descriptions or tool definitions is not context reduction by itself.

Keep current revision/concurrency fields in the first sparse-shape delivery. The technical design separately specifies a later stage binding derivable revisions from retained preparation, including multiple dependent edits in one reply. All current callers change together; no permanent old-format reader or dual public response API is selected. `$defs/$ref` factoring is also a separate evidence-gated refinement because the current local validator rejects references. Provider documentation alone does not make it a drop-in change.

Replacing a nonempty note requires its complete current text in retained preparation; creating or replacing an empty note requires captured authoritative absence/empty state. A missing document binding is not permission to overwrite it. In the later revision-binding stage, a same-reply edit uses a prior accepted new revision only through an explicit dependency on the last accepted writer of that target. A separate concurrent edit is refused when stale, rather than silently rereading and overwriting unseen changes.

## 8. References, identity and readable context

References remains a distinct recognizable section or equivalently explicit mapping. It is not disposable UI decoration. Each selected reference has one permitted label/description and one opaque token bound by the captured request. Keep inventory mappings even when compact inventory prose omits repeated IDs; keep same-name objects and people distinguishable; preserve species/anonymous wording and legitimately learned names.

Create references from the final selected dependency closure. Do not hash every world entity merely to name the few things this observer may use. Preserve stable identity and deterministic collision handling through the existing identity owner; do not invent a second writable handle registry or shorten tokens until collisions silently alias objects.

Stable entity identity and legitimate recognition are distinct from the spelling of a request-local handle. When the selected set changes, deterministic collision lengthening can change a token's text. Only the current captured binding is authoritative; matching an earlier request's token does not grant access or preserve its old meaning.

The mapping must cover every reference in supplied evidence, active operation parameters, exact action choices, goals/notes/intentions and relevant inspection handles. Conversely, a token in a broad unused schema must not become a reason to expose otherwise unnecessary private state. The selection, schema and reference map must agree before dispatch. An unbound, ambiguous, wrong-scope or stale reference fails through the native owner.

Do not remove dates, source distinctions, units or quantities just because they look technical. Use ordinary language for the current day/time and contextual recency; retain the exact absolute clock only for a real consuming contract such as an installed deadline. Suppress floating-point display noise through the shared precision policy. Preserve threshold distinctions and exact invocation parameters.

## 9. Worked supplied-request example: Kest at the watchpost

The supplied request concerns Kest at the Broken Watchpost. It includes accepted personal history and a supplies goal, an older arrival event, Orin nearby, a cache, Kest's equipment/food, visible animals, wood, known preparation/manufacture methods and navigation. This is an illustrative application of the selection rules to the captured request, not proof of what exists outside that snapshot or a prescription of Kest's next act. Exact measurements and qualifications are in the [evidence record](situation-aware-cognition-context-evidence-and-decisions.md).

| Keep or resolve explicitly | Reduce or omit only on the stated basis |
| --- | --- |
| Kest's complete accepted identity, history with Orin and current supplies purpose. | Remove storage wrappers and repeated empty sections; do not replace the person with a possessiveness keyword. |
| Actual current body/work, meaningful timing and the arrival event's historical status. | Do not append raw simulation seconds without an absolute-time consumer or urge another reply merely because arrival triggered the job. |
| Orin's permitted identity/presence, selected cache/wood/animal facts and the shelter's meaningful layout, cover and ways out. | Group repeated ordinary ground descriptions only if traversal and distinct geometry survive. A visible wolf is not automatically an ongoing attack. |
| Kest's equipped knife and shield, food, exact inventory references and known access to the cache. | A sling in a cache is not an equipped sling. Do not lose the inventory IDs that exist in References or treat the cache's contents as owned freely. |
| Useful known making/preparation methods and resource tradeoffs if the current supply decision needs them. | Do not remove all crafting context simply because this could be called an arrival scene. Unrelated full forms need not be repeated. |
| Current situation-specific optional-activity choices and relevant meanings. | Serialize the four installed activity templates once. A full fire-watch form need not be included without a relevant supplied target or other need, but a missing target in a partial discovery result does not prove there is no fire anywhere. |
| Applicable appraisal/feeling evidence and the ability to speak and act. | Remove inactive null siblings; correct the seven-versus-eight operation manual and omitted `interrupt` mode; do not impose one operation per reply. |

If Kest is asked a casual question while gathering, combine speech and work context. If Orin asks for a specific making plan, include relevant quantities, methods and custody. If actual threat evidence arrives, add the threat context and preserve the chosen response route. If a personal opportunity becomes relevant, such as an observed object recalling Kest's former work, retrieve the permitted association without scripting an outcome or inventing a remembered event.

## 10. Incomplete information, overflow and changed state

| Condition | Required behavior | Unacceptable shortcut |
| --- | --- | --- |
| Optional relevance service fails | Preserve required evidence and the existing bounded deterministic discovery/fallback; describe relevant coverage limitations honestly. | Calling an empty result complete, erasing addressed speech, or buying an unconfigured repair call. |
| A required source or dependency cannot be read | Stop the affected generation or use an already authorized independent path whose own evidence is complete; record the actual disposition. | Asking the model to make the original decision with a placeholder that loses material facts. |
| Optional context exceeds remaining allowance | Remove duplication, choose permitted concise representations, then omit the least justified optional closures under the specified selector. Retain discovery/coverage where needed. | Splitting a required quote, losing withdrawal evidence, or selecting one side of a resource tradeoff. |
| Required context alone exceeds allowance | Do not dispatch that generation. Preserve identity, sources, pending work and paid receipts; expose `context-exceeded` through existing diagnostics. | Increasing hidden budgets, silently trimming identity, or forcing the character to abandon work. |
| A large inventory or history is only partly examined | Identify the actual page/query scope and available continuation, without scanning the rest for a decorative total. | Claiming no other tool, memory, route or object exists. |
| Evidence, access or a relevant source changes during a wait | Use existing bounded refresh/revalidation and current publication/admission rules; invalidate affected content and references. | Treating cached text or a prior schema enum as current authority. |
| A provider refuses, returns invalid/partial data or has an uncertain outcome | Preserve the existing distinct failure/accounting outcomes. No actions execute from partial JSON; no automatic paid repair is added. | Treating refusal as an empty deliberate response or assuming cancellation made the call free. |
| A rendered summary conflicts with structured evidence | Retained source and its permitted interpretation control; repair the projection and reject unsafe use. | Replacing history with whichever shorter sentence fits. |

An overflow is a real limitation to surface and improve, not an acceptable way to simulate distraction. Do not ask an ordinary player to manage token budgets or read internal error codes. Existing player-facing surfaces should communicate only the waiting/failure/consequence relevant to play; authorized diagnostics retain technical detail. No new confirmation flow or mandatory explanatory monologue is selected.

## 11. Distinctive gameplay qualification

Use whole activities and their later consequences, with controls for what the character actually knew. Correct mechanics and truthful receipts are necessary; purposeful, interesting play is separately evaluated. The [repertoire review](situation-aware-cognition-context-repertoire-review.md) maps the complete catalogue review and retained examples. These scenarios qualify context behavior; they do not authorize implementing every proposed repertoire mechanic.

| Scenario | Information contrast to exercise | What a successful design permits and preserves |
| --- | --- | --- |
| Talking while making something useful | Same question when idle, during compatible work, and during work that genuinely blocks speech. | Speech/action choice and ongoing progress remain independent where compatible; actual limits remain legible. |
| A former guard grows a garden | A familiar and an unfamiliar problem can use genuinely retained expertise; current equipment/authority differs from the old job. | Transferable knowledge enables invention without forcing a return to an old role or granting old privileges. |
| A spare lid becomes a signal | The useful shape/material is present but the exact use is absent from suggestions. | An informed unlisted proposal is possible; the compiler does not supply the answer or promise unsupported effects. |
| One stock supports two purposes | Immediate survival or camp work competes with a personally valued future project. | Both known uses and commitments survive; the model can choose a real sacrifice or an alternative. |
| An old shower explains a clue | A mundane old observation becomes relevant after new evidence. | Existing permitted evidence can be recalled with its uncertainty; the absent face or solution is not invented. |
| A cheap mug is worth keeping | Practical properties are unchanged, but the person's permitted history and current preference differ. | Sentimental value can affect a decision without a full object biography or automatic affection reward. |
| A shared joke has a later limit | A real shared joke, a new audience and a later request to stop. | Select the fond memory and limiting evidence together; humor remains possible without erasing boundaries. |
| Success frees an afternoon | Provisioning is incomplete in one case and actually complete in another; a pleasant opportunity is unchanged. | Completion is recognized. Work, company, rest, solitude or pleasure remain legitimate choices; no compulsory replacement chore. |
| Different people share a route | Their known interests point toward a material sample, a view and a friend. | Different useful observations and voluntary detours can emerge; a group objective does not merge minds or compel errands. |
| A workplace becomes a battlefield | The same layout supports work, cover and retreat, with actual injury/recovery and personal stakes. | Necessary spatial alternatives survive threat filtering and independent physical self-defense can be demonstrated under CTR acceptance. |
| A companion refuses usefully | A request conflicts with a specific known concern while other contributions remain feasible. | Informed refusal or an alternative is possible; a relationship label neither forces obedience nor erases affection. |
| An unfamiliar sense reveals beauty | An enabled body's permitted sensory facts differ while private knowledge remains unchanged. | Perception can enable pleasure, investigation or adaptation without teaching hidden meanings or assigning species personality. |
| A completed agreement is later changed | A previous promise, performed contribution and explicit amendment/withdrawal share a subject. | The compiler preserves their distinct times and meanings rather than retaining whichever sentence is shortest. |
| A quiet person chooses no response | Nothing new requires a choice or an enjoyable activity is already continuing. | Empty output/continuation remains meaningful; the system does not force speech to prove that context was used. |

Do not make every paired case require different prose or a particular emotion. Qualification checks what information was available, what supported choices remained possible, and whether repeated real decisions show coherent personal differences without scripts. Record any consistently lost opportunity, even if all native actions remained legal.

## 12. Acceptance and measurement

### 12.1 Required mechanical exits

- Every mandatory source and dependency has a valid manifest entry, faithful representation and required exact references at dispatch. No accepted optimization may lose one.
- Selected context is actor-permitted at preparation and at the relevant later disclosure/admission boundary. Current, historical, reported, imagined and unknown meanings remain distinct.
- Speech plus action, repeated operation kinds, empty responses where allowed, explicit plan interruption and same-reply dependencies survive schema/local-parser/native-admission integration. Mixed inactive payloads remain invalid.
- Current supported capabilities are not revoked by presentation filtering. A discovery description has a working inspection route; action admission does not depend on appearing in a shortlist.
- No duplicate activity catalog or full duplicate structural manual remains. Empty scaffolding and exact duplicate source accounts are removed without losing meaningful negative information.
- Full request accounting includes instructions, schema/tool definitions, context, references, output allowance and applicable preparatory calls. Existing per-level, transport, request-count and spending bounds remain authoritative.
- Large-state preparation does not scan/hydrate the entire world or inventory merely to emit a small result. Measure the actual complete caller, candidate coverage and all pre-selection work through PF owners.
- Current serialization, response resolution, native-known responses, reflection payload reuse, reconsideration, previews and direct/provider adapters share the revised contract. Current-format save/load and late-result behavior remain coherent.

Preview qualification requires a complete independently valid talk-only branch, including rejection of an additional `appraise` payload, with current listener/hearing/source/control guards. Provisional words create no world event or memory and execute no other operation. The current retired preview UI is not restored by this project.

A conservative upper size estimate above the allowance does not itself justify refusal if bounded exact measurement of the required encoding fits. Use safe lower/upper/exact bounds as the technical design specifies, preserve actual hard limits, and distinguish a real overflow from an unavailable measurement. Token estimates remain labeled diagnostics under the existing admission policy.

### 12.2 Comparisons and evidence

Separate four claims: **less text**, **less preparation/inference cost**, **equally informed decisions**, and **better playable experience**. No one metric establishes the others.

Capture a baseline and the revised complete prepared request on matched permitted snapshots. Attribute UTF-8 bytes to instructions, each section, References, response schema and any tools. Record current line counts only as a diagnostic of the exported file. Provider usage, cached usage, visible/reasoning output, reservations/settlement and latency are separate measurements; a local byte heuristic is not an exact token count.

Run bounded provider-free comparisons for coverage, references, shape validation and lifecycle invariants first. When implementation is ready and live work is authorized, use the existing evaluation owner for matched ordinary, mixed, crowded, adverse and later-return cases. Keep the selected model/effort, world definitions, disclosure and clock conditions explicit; changing the model at the same time confounds context attribution. Record extra inspections, failed/abandoned choices, repeated calls and total time to a useful outcome. A tiny initial request that forces three avoidable follow-ups can be a regression.

No universal token target or percentage reduction is selected. The supplied request demonstrates removable duplication, not a measured optimum for all scenes. A complex multi-party conflict may legitimately need more context than a greeting. A very large protected identity may keep even that greeting large. Reduce what is unnecessary while retaining the complete required set; then evaluate whether further change is worth its cost.

## 13. Delivery stages and adoption

| Stage | Scope | Exit before advancing |
| --- | --- | --- |
| A — Make the current request explainable | Shared preparation/manifest, source attribution, full input accounting and exact supplied-export reproduction. | Current request components and current limitations can be measured without hiding schema or prep work. |
| B — Remove structural duplication | One semantic activity projection, concise response guidance, empty/duplicate cleanup, sparse operations and all current consumers. | Required meanings and every legal operation remain available; strict local/provider dialect compatibility is established for the selected routes. |
| C — Select detail for the situation | Nonexclusive signals, source discovery, mandatory dependency closure, concise optional representations, References closure and usable inspection. | Mixed and quiet situations preserve meaningful choices; coverage/overflow and current permissions are explicit. |
| D — Complete adapters and lifecycle | Final accounting, exact serialization, private preview, source/authority checks and all current provider/reconsideration consumers. | Complete requests fit current gates; meaningful changes invalidate affected results; benign changes preserve valid preparation and real receipts. |
| E — Remove derivable metadata | Implement the selected later revision-binding and single work-mode stage under the exact technical contract, after sparse consumers are qualified. | Same-reply dependent writes use actual accepted revisions; stale independent writes refuse; unseen text is never replaced; every current caller changes coherently. |
| F — Qualify preparation, decisions and play | Scoped preparation and cache/performance comparisons, native invariants, route/provider integration, whole episodes, later return and complete costs. | Real active large-state callers demonstrate preserved coverage; SC exits and applicable CR/CE/SPK/CTR/IS/PF evidence are satisfied for the enabled scope. |
| Conditional refinement — Factor repeated schema definitions | Evaluate local, nonrecursive schema references after sparse-schema measurements. | Adopt only when measured savings justify the validator change and all configured adapter, preview and local-validation paths qualify; otherwise retain inline definitions. |

These are implementation dependencies, not six independent public formats. Land coherent changes through existing owners. Do not keep a legacy parallel response API. Evaluation can compare retained baseline artifacts or an isolated baseline revision; it does not require a permanent compatibility path in the shipped game.

## 14. Overlap, open decisions and maintained records

The design completes the selected situation-aware preparation, response compactness, reference preservation, explicit discovery and evaluation breakdown. [CR01/CR03/CR04/CR12](../maintainers/cognition-redesign.md) retain current contracts and broader acceptance; [CE03–CE05](../maintainers/character-experience.md) retain complete lives and human experience; [IS02/IS06/IS09](../maintainers/intelligent-simulation.md) retain attention, shared computation and episode evaluation. The focused SC tracker coordinates this implementation rather than replacing those owners.

The related [ND20](../maintainers/needs-design.md#nd20--a-bounded-richer-memory-retrieval-comparison)/DG04 slice is ordinary initial-context selection and a concrete omission comparison; richer retrieval remains conditional. [ND16](../maintainers/needs-design.md#nd16--hearing-and-communication-beyond-direct-path-speech)/SPK's already selected structured speech evidence remains intact. [ND11](../maintainers/needs-design.md#nd11--human-conflictrecovery-and-npc-ghost-continuity) and [ND13](../maintainers/needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization) retain CTR's selected threat/control scope. This design does not close their broader hearing, memory transformation, rescue/afterlife or control-customization needs, nor [ND04](../maintainers/needs-design.md#nd04--experience-shaped-personality-and-practical-skill-growth) or [ND19](../maintainers/needs-design.md#nd19--older-memory-transformation-and-dream-reinterpretation).

**Open developer decisions for this selected design: none.** The following are explicitly bounded implementation/evidence questions, not permission to make the design narrower:

| Question | Selected handling and owner |
| --- | --- |
| What exact omission/representation ordering performs best? | Use the deterministic baseline specified in the technical design, preserving required closure and existing attention. Tune only from held-out omission and whole-episode evidence under SC02/SC09. |
| How are later metadata and schema refinements delivered? | SC12 specifies the selected later revision-binding/work-mode stage and its exact same-reply semantics. Initial sparse delivery keeps current revision fields until that stage. Only local schema-reference adoption is conditional on measured benefit and compatibility; retain inline definitions otherwise. |
| Is native inspection too costly for relevant detail? | Include necessary detail up front whenever there is no adequate timely route. Record concrete friction; a new model detail tool remains a separate conditional extension. |
| Does the supplied export match the exact submitted provider body? | SC01 compares the exact artifact path and validator/transport serialization before classifying the observed null-schema discrepancy as a runtime defect. |
| Can a very large protected identity fit a tiny greeting budget? | This design retains complete identity and existing overflow. Any changed identity quota/projection remains an explicit D55/CG09 product decision; there is no promised tiny greeting ceiling. |
| What cost/latency/quality improvements result? | Measure them after implementation through SC09/SC11 and existing evaluation owners. This design records no runtime or player result. |

## Maintained records

- Implementation and unsatisfied acceptance: [SC01–SC12](../maintainers/cognition-context.md), coordinated with [CR](../maintainers/cognition-redesign.md), [CE](../maintainers/character-experience.md) and [IS](../maintainers/intelligent-simulation.md).
- Limits and policy choices: [Cognition constraints](../limits/cognition.md#situation-aware-context-selection), including required identity, inherited budgets, overflow, selection coverage and staged schema decisions.
- Mechanism and callers: [Technical design](situation-aware-cognition-context-tech-design.md).
- Conversation/source/measurement record: [Evidence and decisions](situation-aware-cognition-context-evidence-and-decisions.md).
- Catalogue coverage and opportunity cases: [Repertoire review](situation-aware-cognition-context-repertoire-review.md).
- Shared evaluation: [Feature specification](intelligent-simulation-evaluation-feature-spec.md) and [technical design](intelligent-simulation-evaluation-tech-design.md).
