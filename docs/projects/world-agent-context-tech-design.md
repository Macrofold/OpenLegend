# World Agent context and invention loop: technical design

**Status: approved implementation target; implementation in progress.** Implements the requested design scope of the [feature specification](world-agent-context-feature-spec.md); it does not change current runtime contracts until accepted and delivered. Medium effort is the owner's explicit target. [Project packet](world-agent-context/README.md) records the inspected baseline and examples.

## 1. Architectural decision

Construct one small, authoritative-context packet for the task, using current application projections and native mechanical owners. Render its instructions in plain English and its selected facts in simple YAML. Keep model submissions as strictly typed tool arguments. Expose a small task-specific tool profile and let native application code coordinate saving and review.

The design optimizes the number of decisions and round trips before optimizing punctuation. It does not assume YAML is universally cheaper than JSON, use a second model to select context, or infer arbitrary native behavior from source code. Mechanical completeness comes from supported owner projections and final native checks. The [initial graph and pipeline foundation](world-agent-context/initial-foundation.md) specifies the mandatory first-version subset of the existing canonical contracts; this document owns how that analysis reaches the model and submission path.

```mermaid
flowchart LR
  A[Player goal and selected draft] --> H[Source-backed dependencies and requirements]
  H --> B[Scoped facts and mechanical context]
  B --> C[Agent with selected typed tools]
  C --> D[Native graph, required checks and save for review]
  D --> E[Exact saved review]
  E --> F[Human approval]
  F --> G[Existing native Apply]
  D -->|Actionable findings and saved revision| C
```

The agent finishes when E exists and explains it. F and G are separate authoritative operations; the agent's final text does not cause either one.

### Owners reused

| Responsibility                  | Existing owner; proposed work                                                                                                                                                                                                |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mechanical rules and effects    | `packages/domain/src/invention-families.ts`, `declarations.ts`, native action/body/status/attribute/resource owners. Add small read-only descriptions adjacent to actual consumers where absent; no alternate rule registry. |
| Bundled-world choices           | `packages/domain/src/worlds/base/` and `docs/worlds/base/`. Numeric rules remain authored there or in their existing finite-family owner.                                                                                    |
| Eligibility and context         | `apps/server/src/invention-context.ts`, `world-tools.ts`, `world-authoring-metadata.ts`, `world-authoring-kinds.ts`; new focused context assembler uses their projections.                                                   |
| Saving and review               | `WorldAuthoringService` in `world-authoring.ts`, current PostgreSQL records, `WorldService` admission and reviewed transitions. Add convenience orchestration inside this owner.                                             |
| Relationships and check records | Existing `world-graph.ts`, `relationship-index.ts`, kind validators and draft/review repositories. Extend with a derived candidate overlay and bounded native plan; no separate graph store or scheduler.                    |
| Mechanical field schemas        | Existing declaration/Zod schemas; hand-validated kinds need a source-aligned strict schema before promising generated typed templates.                                                                                       |
| Tool transport                  | Shared descriptors, `world-mcp.ts` and authenticated local HTTP. Thin adapters, same result and identity contracts.                                                                                                          |
| Execution and spending          | `world-agent-runner.ts`, `world-agent-store.ts`, `macrofold.ts`, current reservations and receipts. No new coordinator, wallet or paid selector.                                                                             |
| Human presentation              | Existing World Agent conversation/review/usage UI; exact plans produce review cards.                                                                                                                                         |

Source paths in this table are repository-relative. [Mechanics inventory](world-agent-context/mechanics.md) links the concrete consumer files and current support boundaries.

## 2. Context representation

The application builds a typed object before rendering text. Keep two separate projections:

- **Model packet:** goal, attributable requirements, current selected draft/review, relevant materials/targets, selected mechanics, short dependency/check/readiness summary, output field guide and next action. Each fact has one natural home. No whole-world object, credential dump, duplicate schema or ledger history.
- **Private application record:** current authority/audience, generation, definition/material/target pins, projection versions, omitted optional sections, operation identity, measured sizes and execution configuration. This record binds facts to admission; it is not another mutable world state.

A packet identity is a reference, not an authorization token. Submission echoes a non-secret `packetRef`; the application binds that record to the active turn's context handle, recipient, generation and exact dependency pins. Readable material IDs are sufficient inside the candidate because submission resolves them against that bound packet, rejecting changed required facts. References not in the packet require permitted inspection and a refreshed packet before submission. Do not abbreviate IDs into unexplained integer codes or require the model to construct hashes. Reading a newer definition may replace a model-visible fact for future work, but never silently refreshes an existing draft's retained base/material pins. A stale retained base requires the existing explicit new-draft path.

Inspection that adds required facts returns a new `packetRef` alongside those facts. A retained invalid revision likewise returns the refreshed packet ref needed for its correction. Never mutate an earlier packet's meaning. Keep derived packet versions only while an active turn or unresolved operation refers to them; completed outcomes retain their request fingerprint, draft pins and receipts under existing operational retention. Bound issuance by the admitted turn/tool-work limits and CTX03, rather than accumulating an unbounded second history. Same-ID replay resolves its receipt before requiring a still-resident packet.

### Rendering order

1. Short trusted role/completion instructions.
2. The person's request and explicitly retained constraints, delimited as user content.
3. Current draft and unresolved operation/review state, if any.
4. Selected world mechanics and eligible material/target facts.
5. Selected field guide/example only when not already expressed by the tool schema.
6. Missing information and explicit next action.

Use stable keys, readable IDs, ordinary English and named units. Preserve multiline descriptions as escaped YAML scalars. Do not concatenate unescaped player text into trusted instructions. Tool observations, authored labels and evidence remain untrusted data even after formatting.

Static safety/completion text belongs in the executor's trusted instruction channel where supported. Today OpenLegend embeds its instructions in a user-message JSON envelope; qualify the native instruction channel before moving them. Provider/persona prompts and useful environment metadata are counted separately when measuring actual requests.

## 3. Mechanical descriptions

Use one common description shape, populated only by each actual semantic owner. Omit irrelevant fields, but never omit a necessary condition to hit a byte target.

| Field                | Meaning                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`, `name`         | Stable capability/definition identity and plain-English label.                                                                                                                 |
| `support`            | Separately state executable, inspectable, authorable and applicable under the current grant. Unknown projection coverage is explicit.                                          |
| `purpose`, `acts_on` | What a person can accomplish and what kind of thing receives the effect.                                                                                                       |
| `bindings`           | Named roles and exact bindings: subject, source, action target, participant, material definition, live instance or resource source as applicable; no fixed three-role ceiling. |
| `requires`           | Mechanical prerequisites, target/material eligibility and state needed at admission/effect time.                                                                               |
| `fields`             | Meaning, type, units, range, required/optional/default/omission semantics and incompatibilities for selected authoring fields.                                                 |
| `reads`, `changes`   | Relevant state dependencies and effects, including exact typed resource identities.                                                                                            |
| `provenance`         | Source/observer/time and scope for claims, observations, assumptions and negative findings; matching text is not matching evidence.                                            |
| `process_owner`      | Who supplies continuing work/resources, retains progress, observes stop/wake conditions and owns cancellation, when the actual family supports an ongoing process.             |
| `timing`             | Work/start/completion/consumption/interruption rules in simulation units; distinguish an ongoing rate from an immediate delta.                                                 |
| `interactions`       | Conditions and other mechanics that alter the result; coexistence, non-stacking, restrictions and current migration behavior.                                                  |
| `limits`, `coverage` | Unsupported computation and what the current inspection/validation actually establishes.                                                                                       |

Descriptions are views, not executable definitions. Numeric envelopes come from structured contracts/installed definitions. Native conditions that are handwritten require an owner-maintained explanation and a consistency check against the consumer; schema reflection alone cannot discover their meaning. Coverage must identify missing mechanical adapters. The initial owner set is finite: recipes/craft, hunting/ammunition, gathering, needs, status effects, custom attributes and existing native commands.

Layer disclosure: a brief capability entry explains purpose/support; a selected mechanics entry gives the required operational details; exact templates/relationship/evidence views are read only when needed. Exploratory traces remain bounded path witnesses. Required analysis uses the [candidate graph and native check coverage](world-agent-context/initial-foundation.md#4-small-shared-candidate-graph), which must not infer dependency closure or cycle safety from the trace tree. Full world status policies are not copied into every invention prompt.

For ordinary recipes, include eligible inventor materials alongside world-level mechanics. Broader owner inspection must not bypass current inventor knowledge/admission rules or write inspected facts into NPC memories. Non-recipe owner edits use their own authority and target checks.

## 4. Deterministic selection and bounded assembly

No model call is required to assemble known context.

1. Resolve the session, recipient grants, initiating request, selected artifact and any unresolved operation through existing repositories. Reconcile an uncertain prior submission before offering another mutation.
2. Select an authoring profile from an exact selected artifact/kind or an unambiguous application intention. If intent is genuinely open, start with discovery rather than guessing a weapon family from one word.
3. Seed required facts from the selected candidate, explicit material/target IDs and family. Query bounded, scoped indexes for named materials/capabilities. Use existing lexical search initially; new embeddings are unnecessary for this project.
4. Use the shared source-backed graph/analysis for the selected kind, overlaying the exact draft when present. Follow the owner's required dependencies needed to explain and validate that operation: materials, resource identity, relevant body values, selected status definition/conditions and affected capabilities. A weapon needs its consumers and ammunition; it does not need every sleeping actor. A sleep-policy edit needs fullness/expenditure/waking interactions, not all recipes. Preserve projection coverage, required-check coverage and broader unevaluated interactions separately. Missing required bindings/frontiers remain explicit.
5. Project required facts first, optional examples/history second. Deduplicate by `(audience, generation, kind, id, source revision, projection version)` before serialization. Keep semantically different evidence and definitions separate even if labels match.
6. Enforce preparation work, result bytes and overall context bounds before dispatch. Required information that cannot fit produces `needs_investigation` with a bounded continuation, not a truncated “complete” context. Page additional optional information on demand.
7. Render, validate the packet shape, measure its components and journal its identity/configuration before paid admission.

A whole-world graph build followed by a tiny final slice does not establish bounded preparation. Existing graph ceilings and caches remain in force; profile-specific direct lookups should avoid rebuilding unrelated graphs. Record examined rows/nodes and formatted bytes. Broader directory/index optimization stays with WW15/PF unless this project's measured caller requires it.

[CTX02](../limits/inventions.md#ctx02--preparation-and-disclosure-work) owns provisional aggregate assembly limits and overflow behavior. They bound one slice, not all discoverable mechanics; accumulated required work must remain resumable and explicit.

Within a request, reuse matching reads and immutable schema/description fragments. Start without a cross-session live-state cache. If later measurements justify one, key it by grants/audience, generation and all dependency revisions, bound memory and invalidate it through existing owners. A world edit, load or reduced disclosure scope must not reuse stale/private model history.

## 5. Tools and selected profiles

Prefer a few named, typed operations over a generic `execute` tool with a second command language. For the initial recipe profile:

| Proposed model tool  | Purpose and compact result                                                                                                                                                                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ol_find`            | Existing bounded lexical discovery, with selected kinds and explicit continuation. Return readable refs, labels, purpose/support where available.                                                                                                                                                                                                            |
| `ol_inspect`         | Exact read with requested sections such as facts, mechanics or relationships. Add a scoped `authoring-operation` outcome read by operation ID for reconciliation; it distinguishes pending, retained outcome and unavailable. Default facts omit automatic empty graph neighborhoods. Multiple independent exact reads may be batched under existing bounds. |
| `ol_authoring_guide` | Source-backed selected-kind field guide/capabilities when missing from the initial packet. Return a schema/template once, with version and scope.                                                                                                                                                                                                            |
| `ol_recipe_submit`   | Strict recipe object, bound `packetRef`, operation identity and optional exact edit/derive reference; save/validate/prepare through the existing service. Return a compact durable outcome.                                                                                                                                                                  |

These four core operations are implemented. The recipe profile additionally includes `ol_request_capability` so another supported kind remains reachable; it grants no permission or spending. This is one recipe-family adapter, not one tool per sling, bow or material. A fresh context normally includes the guide/materials, so the simple path uses only submission and the final explanation.

The selected recipe schema presents structured arguments directly, replacing `payloadJson` string encoding at this model boundary. Internally it still normalizes into the existing canonical declaration. The current model-facing/provider schema requires nullable inapplicable branches, which normalization removes before canonical storage. Selected launcher/ammunition/gathering variants can omit these branches through the same codec; normalization never invents materials, parameter values, effects or player choices. A derive operation requires an inspected existing recipe ref; a new-candidate schema has no `baseRecipeId` field. Edits require the exact expected draft revision. Initial release may retain current model-facing nullable fields until a smaller variant is qualified.

Other kinds receive their own typed submit surface from the existing kind adapter, after schema coverage is adequate. Reuse the same save/review orchestration. Existing approved Apply has a separate profile with exact approved-plan references. Read-only investigation retains actual graph/evidence tools when needed; nothing grants them implicitly to a narrow run.

### Profile changes and one conversation

Current Macrofold sessions retain accepted tool/configuration grants. Do not assume a `tools/list` refresh can expand them mid-run. Select a profile before admission. Initial delivery chooses a new profile on the next authenticated user turn when exploration identified another needed kind. The agent explains that need in ordinary final text; prose never starts another paid run. Reconcile the old run before starting a fresh remote model session with safe continuity. The UI conversation and funding session stay the same, and the player need not choose technical tool names.

For automatic continuation, WW22 must first add a typed `ol_request_capability` control operation to the discovery profile. It records a supported kind and reason as a pending request, granting no tools, permissions, money or writes. The native coordinator verifies that the requested stage is within the original human request and grants, reconciles terminal execution/accounting, and independently admits a fresh profile/session under the same remaining funding. It refuses ambiguous/failed prior paid work and pauses for any consequential new choice. Do not expose this extra operation on the common recipe profile unless required by measured journeys. This is planned stage progression, never an automatic paid retry or new allowance. New privileges, world-wide policy scope, destructive actions or expanded spending retain the relevant human decision. Native continuation must be qualified before enabling it.

### Authentication remains explicit

Current MCP authoring requires an application-issued `contextHandle`, in addition to connector authentication. Retain that binding in the first implementation, even though repeating it has a token cost. Examples use a placeholder. Never substitute a model-selected session ID or the shared bearer credential. Removing it from model arguments needs a separately qualified per-run transport injection that preserves the exact principal/audience/session/generation binding; that optimization is not a prerequisite for the main savings.

## 6. Submit, completion and recovery

Add the convenience operation to `WorldAuthoringService`, sharing existing session serialization, PostgreSQL transaction/repository helpers and world scope checks. Do not implement a parallel writer or call the application's public HTTP route from inside its own transaction.

1. Authenticate current scope/generation and compute the exact operation fingerprint. Consult the operation record before checking current selection, expected revision or base freshness. Same operation ID/body replays its retained outcome; reused ID with different body is rejected. Only a new operation checks active admission, expected revision, bound packet pins and current eligibility. Reduced/revoked scope cannot recover now-forbidden private records.
2. Reject malformed/unauthorized/stale input without a new draft revision. For well-formed candidates, construct an immutable draft through the existing base/material pin owner.
3. Derive the exact candidate graph and bounded native validation plan; retain attributable requirements, applicable evidence and presentation adequacy alongside authoritative authoring validation, including current inventor admission. `ol_validate_recipe` alone is insufficient: it checks a finite recipe against world facts, not the entire authoring request or user intent.
4. For semantic validation failure, retain the candidate revision and precise findings with no review plan. Required incomplete/unsupported analysis or missing required presentation retains a pending/blocked candidate, with a bounded continuation where supported, rather than an activation-ready plan. Return `needs_revision` with the retained revision and field-level repair guidance only for candidate defects. Incomplete analysis returns `pending_analysis` with a supported continuation; unsupported required capability or representation returns `blocked` with a precise finding. These outcomes preserve work and do not request a rewritten candidate or authorize a paid retry.
5. For supported-scope success, calculate current native impact, create the exact pending plan and store the operation result atomically with the draft/review/check/readiness records. Broader unevaluated interactions remain labeled; a `none` impact token is not proof of no interactions. Pass the same captured immutable world snapshot to base extraction, native validation and impact calculation; today's validation reads `service.world` internally, so capturing a variable alone is insufficient. Preserve existing lock ordering: never enter the world mutation lane while holding an operational database transaction. Apply still rechecks current world state. A PostgreSQL transaction alone does not lock world state.
6. Return `ready_for_review`: “Saved revision N. Human review is ready; finish with a brief explanation.” The current application already lists pending plans; no separate model approval-request call is needed.

The [native work plan](world-agent-context/initial-foundation.md#5-small-native-work-plan-and-readiness-projection) is a bounded record of required checks and prerequisites. It is separate from physical action sequencing and native invalidation dependencies. Required long analysis cannot hold a database transaction or paid harness open; retain pending work or a truthful unsupported blocker.

This transaction adds no world effect. Human approval binds the exact plan/digest/revision; existing reviewed Apply remains the only live mutation route. Neither the return status nor model prose constitutes approval. User-intent coverage also matters: a mechanically valid sling does not satisfy a homing request. Unsupported requested behavior must remain an explicit finding instead of being silently approximated.

On a lost response, the native coordinator first reconciles the original operation record before resuming a model. During a run, the proposed exact `ol_inspect` authoring-operation view can recover that retained outcome; replaying the same submit ID/body is also safe. This read extension is new work, not a claim about today's public tools. Never generate a new ID to guess whether saving worked. A fresh model packet receives the resolved saved revision/review, not the entire failed transcript. If operation state remains uncertain, block dependent writes and say why.

If invalid drafts exhaust existing quotas, return capacity and preserve retained records. No automatic deletion/reset. Current-format persistence remains PostgreSQL; this proposal does not authorize migrations for old development saves.

## 7. Deduplication and continuity

Distinct reductions have distinct owners:

- **Within one packet:** select each fact/template once. Do not repeat a tool catalogue inside `ol_context` or a full schema both in a tool and its guide.
- **Within one tool result:** return requested facts, a compact status and needed refs. Graph/evidence details are explicit projections. Keep short safety/coverage statements where they prevent misinterpretation.
- **Within one model session:** reuse already delivered unchanged material/guide facts while they remain in visible context. A revision marker alone cannot replace facts the model has never seen or that compaction removed.
- **Across resumed sessions:** reconstruct selected drafts, exact approvals, findings and user decisions from application records; send necessary facts again. Separate this working view from the retained full audit transcript.

Use current draft JSON as the complete selected candidate. Store accepted constraints and unresolved questions without letting a lossy model summary become their authority. User wording stays attributable; an agent hypothesis never becomes an accepted requirement. Retain unresolved effects/costs and original operation IDs through reduction. If a summary cannot preserve required meaning, retrieve the source rather than fabricate a smaller equivalent.

Macrofold currently owns its harness transcript. OpenLegend cannot arbitrarily delete or reorder tool exchanges inside it. First implement deterministic packet assembly and fresh-session continuity; optional native harness compaction is separate qualified work. The NPC [conversation compaction project](conversation-compaction-tech-design.md) is related guidance, not a store or authority to reuse for this administrative conversation.

## 8. Plain English, YAML and field templates

Use schema-controlled serialization, not string concatenation or executable template expressions. Authored static instructions can be reviewed text; facts are data. The examples show intended rendering, not new editable game configuration or a parser that authorizes YAML effects.

- [Prompt template](world-agent-context/examples/prompt-template.yaml): section ownership and safe substitution.
- [Sling context](world-agent-context/examples/sling-context.yaml): relevant mechanics/materials for a synthetic fixture.
- [Recipe fields](world-agent-context/examples/recipe-fields.yaml): meanings, units and omission rules.
- [Recipe submission](world-agent-context/examples/recipe-submit.yaml): proposed typed tool arguments and outcomes.
- [Sleep context](world-agent-context/examples/sleep-context.yaml): cross-system interaction and unsupported item binding.
- [Candidate graph](world-agent-context/examples/candidate-graph.yaml): exact illustrative references, typed dependencies, provenance and independent coverage.
- [Pipeline/readiness](world-agent-context/examples/pipeline-state.yaml): attributable requirements, native checks and distinct saved/review/activation/presentation/use facts.

Examples are illustrative projections of the baseline. Implementation generates factual values from current owners and checks drift; never load these snapshots as a second authored source of world rules. Use no YAML anchors, custom tags, implicit dates or executable interpolation in model packets. Escape potentially ambiguous scalars. Preserve ordinary field names, units and useful explanations instead of token-saving abbreviations.

Templates express a shape, not a canned finished invention. The agent chooses creative parameters within current rules. Ship one selected example only when field guidance is insufficient; do not send every family example on every request. A schema documents representable fields; a mechanics guide documents their runtime consequences. Neither replaces native validation.

## 9. Medium effort and Macrofold responsibilities

The previous authoring path used `macrofoldModelParameters('full')` (`xhigh`). The implementation now selects World Agent-specific `reasoning.effort: medium`, with strict parameter support and existing BYOK/model selection; generic full cognition remains unchanged. The inspected local Macrofold adapter accepts medium for the configured model and forwards admitted model parameters. Live outbound capture must still prove the actual setting reaches the provider; do not claim measured quality from source inspection.

Changed admission configuration requires a fresh remote session with safe continuity where the current session cannot honor it. Preserve the same conversation/ledger and reconcile the previous Run first. Do not force a small output ceiling that truncates valid candidates; retain the existing output guard until measured candidate/reasoning needs justify a separate change.

Macrofold should derive filesystem affordances from effective file permissions: no access means no file tool/instructions; read-only means reading guidance without save promises; writable output scope permits output guidance. Internal harness checkpoint persistence remains available without exposing agent file access. Its current `harness_prompt_mode: replace` does not remove unconditional worker output instructions. Suppress the harness question tool when the application uses ordinary final-text questions, and use readable unique tool aliases rather than opaque hashes where safely supported.

These are changes in Macrofold's repository, coordinated through WW21; this design does not modify that checkout. An OpenLegend prompt cannot securely remove tools or override a conflicting privileged system message. Qualify permission intersections, resumed/warm sessions and file-enabled regression cases in that owner.

## 10. Verification and measurements

Design-time checks: parse every example YAML, inspect field values against current owners, review links/anchors, review the full diff and all task/limit states. No paid runs are needed for this document package.

Implementation evidence must separate native, fixture and live-provider results:

| Journey/check                                       | Required evidence                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New sling and one later refinement                  | Real tools save a candidate/revision/review; no guessed base, file detour, redundant schema read or claim of installation.                                                                                                                                                                                        |
| Gathering tool                                      | Correct total yield, finite source, non-stacking and crafting consequences.                                                                                                                                                                                                                                       |
| Sleep-enhancing bed, edible cure, homing projectile | Specific unsupported capability retained; no global policy substitution or invented executable field.                                                                                                                                                                                                             |
| Owner sleep-policy change                           | Correct full-policy effect, subject/target bindings, fullness/expenditure/waking interactions; unrelated definitions preserved or removal explicitly reviewed.                                                                                                                                                    |
| Custom charge and native action                     | Definition vs attachment vs supply vs value intervention distinguished; native command preconditions remain authoritative.                                                                                                                                                                                        |
| Faults                                              | Invalid candidate retained without plan, stale material/draft/target, duplicate ID/body, ID collision, response lost after commit, cancellation, restart/restore and revoked scope.                                                                                                                               |
| Graph, checks and presentation                      | Candidate/context/review ref parity, recipe and status adapters, missing/stale required sources, negative membership invalidation, cycle semantics, adequate fallback/no-new-asset/missing-presentation cases from the [initial proof](world-agent-context/initial-foundation.md#6-concrete-first-version-proof). |
| Repertoire design boundaries                        | Named joint roles, continuing processes, ordered physical prerequisites, attributed evidence, identity/topology/time constraints remain expressible as requirements or precise unsupported findings; no new runtime claim.                                                                                        |
| Privacy                                             | Different recipient grants, private evidence, cross-session caches and reduced-grant fresh context; no leaked raw packet/credentials in diagnostics.                                                                                                                                                              |
| Execution                                           | Actual medium parameter, correct profile, no unauthorized file tools, fresh-session continuity, no new allowance/retry on ambiguity.                                                                                                                                                                              |
| Bounded work                                        | Many irrelevant definitions/history records, paging/incomplete results, required-context overflow; inspect upstream work as well as final bytes.                                                                                                                                                                  |

Record initial and every subsequent request: role/instruction bytes, tool-definition bytes, current facts, selected candidate, retained history, model input/output tokens when reported, provider-reported cost, reserved/uncertain exposure, calls, invalid calls, time to saved review, final task correctness and unsupported claims. Do not log secrets or full private prompts by default.

Compare identical goals, world/material state, grants, model, effort and history conditions when isolating context changes. Evaluate medium separately from context reduction, so quality changes are attributable. The old failure capture is diagnostic evidence, not a successful matched baseline. Use the smallest paid sample under the remaining task ceiling; expand only for a concrete quality/variance concern. Existing WW07 financial holds and unknown usage remain; this project cannot reset them. Byte goals and expected turn counts are provisional [CTX limits](../limits/inventions.md#world-agent-context-proposal), never permission to truncate required mechanics.

## 11. Staging, risks and choices

WW18 delivers source-backed projections, the candidate graph and bounded shared analysis first. WW19 adds the transactional submit path, native validation records, presentation adequacy and precise readiness outcomes. WW20 integrates typed profiles/templates and medium. WW21 coordinates Macrofold affordances. WW22 qualifies continuity and additional kinds; WW23 measures complete journeys. Reconcile accepted target changes into runtime/MCP/composition owners as each slice is approved and delivered.

Tradeoffs: selected profiles reduce irrelevant schemas but require explicit session transitions; native save-for-review reduces model round trips but needs atomic operational persistence; shared graph analysis prevents three competing context/validation/review models but requires deliberate adapters and scoped coverage; sparse reads reduce bytes but require honest coverage; field descriptions improve understanding at a small token cost. Preserve these meanings before pursuing compression.

No new universal effect language or metadata interpreter is proposed. Richer authoring requires a real adapter with native semantics, disclosure, lifecycle and examples. Status-policy compact edits may eventually apply explicit typed edits to an exact base, but the current whole-policy replacement contract remains until that adapter is separately reviewed; omitted definitions must never disappear as a context-saving shortcut.

No unresolved product decision blocks delivery of this design. The implementation must qualify Macrofold session/profile/medium behavior and strict schemas for hand-validated kinds; these are tracked engineering gates, not presumed capabilities or permission to broaden scope.

## Maintained records

- Implementation: [WW17–WW23](../maintainers/world-agent-writes.md#context-and-invention-loop-design).
- Limits and constraints: [CTX01–CTX06](../limits/inventions.md#world-agent-context-proposal); existing native/session limits remain controlling.
- Related contract/design: [Feature specification](world-agent-context-feature-spec.md), [runtime](../world-agent-runtime.md), [MCP](../world-agent-mcp.md), [composition](../invention-composition.md), [save/load](../save-and-load.md).
