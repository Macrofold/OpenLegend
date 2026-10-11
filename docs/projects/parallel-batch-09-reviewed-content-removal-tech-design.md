# Batch 09 — Technical design for reviewed condition removal

| Status      | Current progress                                                                                                            | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Not started | Current status-effect removal, dependency readers and reviewed-write owners are mapped into one independently complete task. | 2026-10-11   |

## Baseline and readiness

Source inspected in `Macrofold/OpenLegend`, local `main` at `2c3f52038e3c1afae0f2cc7586c3e740f1cf5ad5`, also `origin/main` from `https://github.com/Macrofold/OpenLegend.git`, on October 11, 2026. This design changes no runtime code. The [feature specification](parallel-batch-09-reviewed-content-removal-feature-spec.md) owns the intended creator experience. Existing source supports the needed condition mechanics, definition authoring, graph inspection, exact human reviews, native policy replacement, atomic receipts and persistence. The new deletion plan and UI are this assignment's implementation, not missing prerequisites.

**Start readiness: Ready once these planning documents are present in the worker's starting checkout. Open prerequisites: None.** No behavior from Batch 06, Batch 07 or Batch 08 is required. One agent owns RD01–RD05 on `codex/reviewed-content-removal` and can complete every criterion even if those projects never start. Shared-file overlap with their authoring or projection work does not create an intermediate-delivery dependency.

## Why this first consumer

`admitStatusEffectPolicy` already removes omitted status definitions and their ordinary instances, using `deactivateStatusEffect` to finish active work under the old definition. `validateStatusEffectPolicy` validates exact `statusActive` references; body/dream policies and retained independent contributions can prevent removal. The creator-facing review currently retains an affected count and episode token rather than the complete deletion explanation.

This is therefore a concrete extension of an existing lawful operation. By contrast, `admitAttributeDeclaration` permits removal only when live bindings/actions/sources no longer depend on the attribute, and there is no general current recipe/material/stock retirement operation to adopt. Those semantics are not invented here. Positive examples use creator-authored conditions; bundled Sleeping supplies a real protected-dependency refusal. Generic code does not infer whether an ID is removable from its spelling or namespace.

## Source and responsibility map

| Responsibility | Existing owner and precise use |
| --- | --- |
| Definition conditions and native removal | `packages/domain/src/status-effects.ts`, `status-effect-validation.ts`: supported condition traversal, complete candidate validity, old-definition deactivation, state removal and instance/action agreement. |
| Dependent body rules and retained contributions | `body-policy.ts`, `state-contributions.ts`, `contribution-residency.ts`, `status-capabilities.ts`: keep exact pins and existing refusal; do not detach another owner's data. |
| Active activities and work | `agency.ts`, `native-work.ts`, `work-budget.ts`, called by the status owner: end only the condition's occupied activity and release its actual reservation. |
| Current relationship discovery | `apps/server/src/world-graph.ts`, `relationship-index.ts`, `world-tools.ts`: exact definition IDs, versions, source paths, existing search/inspection and bounded presentation. General graph traversal remains exploratory. |
| Saved candidate, review and Apply | `world-authoring-kinds.ts`, `world-authoring-analysis.ts`, `world-authoring.ts`, `world-agent-store.ts`: one status-policy candidate, immutable revisions, precise preparation, human decision and retained plan. |
| Native writer and storage | `world-service.ts` (`reviewedTransition`, scoped history preparation), `world-records.ts`, existing command receipts: atomic world/result publication, current authority and cold contribution rows. |
| Entry and wire contracts | `http.ts`, `world-authoring-contracts.ts`, `world-authoring-schemas.ts`, `packages/protocol/src/index.ts`: shared native preview/selection/read results; no client-supplied approval or affected set. |
| Creator controls | `apps/client/src/ui/world-inspection.tsx`, `world-agent-work.tsx`, `world-agent-work-details.tsx`, `world-agent-review.tsx`: discover, inspect, revise optional selection, approve, Apply and recover in the existing workspace. |

The feature introduces no new fictional effects, command family, dependency database or mutation queue. If a small shared visitor is needed, place it with the domain's typed status-condition owner and consume it from native validation and the existing graph/authoring readers. It must enumerate semantic references and source paths, not walk arbitrary JSON strings. A hypothetical future family supplies its own complete dependency/deletion adapter before becoming removable; it does not gain support by appearing in the generic graph.

## RD01 — Complete finite dependency and live-impact analysis

### Definitions and selection

The explicit roots are exact installed status-effect references. Bind a removal request to the existing principal/world/session/timeline, expected policy revision and source digests. The server owns root validation, optional-candidate derivation, closure, reasons and the proposed full policy. A client sends intentions and optional IDs, never its own required set or completeness claim.

For a removal-only proposal, start with the selected roots plus selected optional roots. Build one reverse adjacency of native status references from all current definition predicates: `requires`, activation/deactivation predicates and every conditional `whileActive` rate. A definition referring to a removed definition must also be removed; both true and false `statusActive` predicates are structural dependencies. Expand with a visited worklist until closed. Valid mutual references remain one complete set. Preserve all unchanged definitions, order, named times and clock configuration exactly.

Retain one readable dependency witness for each required inclusion, plus its exact referring field and direct reasons where useful. Do not enumerate every path through a cyclic or densely connected graph. One optional candidate is a retained status definition explicitly referenced by a definition already in the required removal set. It is not automatically removed. Selecting it adds a root and recomputes required closure and external blockers; deselecting it cannot remove a definition still required by another selected root. Clearly identify optional selections whose removal becomes required by another choice.

Body-policy conditions, the cognition dreaming reference and retained independent contribution pins are outside this deletion adapter. Show a permitted blocker; do not edit those policies, delete their records or reinterpret a missing reference as false. A contribution with ended hot-world activity can still be retained in SQL and protect its definition. The ordinary native validation runs against the exact candidate after analysis and remains authoritative. Any new native refusal is an incomplete/unsupported plan, never evidence to weaken that validator.

### Exact live effects

For every removable definition, enumerate all ordinary per-entity condition entries that the native owner will remove, including inactive cooldown entries, and the precise active episodes that will end. Identify occupied actions/work releases as updates, not additional fictional deletions. Instances belong to entities, so non-actors cannot be omitted. Distinguish the removal set, updates/endings, preserved history and blockers in the review model.

The impact binding includes exact entity/definition/episode identity, activity membership and the structural source/target or revision facts needed to establish the same operation. Changing elapsed time or an unrelated meter alone need not stale an unchanged episode. A newly active or ended episode, a changed binding, changed definition or newly incoming reference must invalidate the review. Stored record identity uses the complete world/entity/record-kind key; duplicate labels and delimiter-containing IDs cannot collide.

Do not infer complete retained contribution history from resident maps. Current `admitStatusEffectPolicy` requires complete contribution history for every entity before replacing any definition. Preserve that native contract: extract a status-record-only materialization path from the existing `world-records.ts` owner and completely materialize each incomplete entity's status map, preserving record order and residency metadata. Reuse that immutable prepared snapshot for the pin scan and native candidate analysis, with current generation fencing; prepare fresh authoritative history before Apply. A selected-definition SQL absence check alone does not satisfy this native precondition. Batch required status reads where practical, but do not hydrate unrelated memories, appraisals or object history. Missing storage coverage blocks a complete result. Current graph nodes/edges support navigation and explanation, but their general `not-evaluated` impact status is not converted to universal proof by this finite adapter.

## RD02 — Exact saved removal reviews

Reuse the existing `status-effect-policy` authoring kind and its complete native candidate. Add server-generated removal intent/analysis to its current saved revision and review representation as needed; do not create a parallel installation store. The model or direct creator UI can request the same native preparation, but only the human can approve the exact saved review.

The retained plan contains root/optional selections, the complete required definition and instance set, exact source revisions, dependency reasons, updates/endings, current blockers/coverage, and the candidate digest. Existing review identity binds that complete content and the current audience. Page the retained complete plan; a page cursor binds the plan/digest/section and current permission. Counts describe that plan, and client filtering cannot change its approved membership. Do not make the model carry all rows to preserve them.

Selection changes create a new exact candidate/review revision and invalidate the former approval. Cancellation rejects or abandons the unapplied plan through the existing lifecycle without mutating the world. Hide/reopen and receipt lookup remain read-only. Preserve dirty choices while valid; access/world/session/timeline replacement follows existing private-draft invalidation.

Full-policy authoring also participates. Detect all removed current definitions from the candidate diff, attach the same exact removal analysis, and require its complete review. A mixed candidate may retain its expressly authored non-removal edits under existing validation, but cannot silently repair a dangling reference or automatically add deletions beyond the displayed approved revision. Invalid mixed candidates explain their missing dependency and require a corrected candidate. The dedicated removal control constructs a deletion-only candidate and its closure automatically.

The direct `/api/god/status-effects` path currently applies supplied policies through native admission. When its candidate removes a definition, it must route into the same native prepare/review flow or return a truthful review-required result with a reachable route to that flow; it cannot keep a destructive shortcut. Update current callers/contracts together under the development policy. Non-removal editing retains its current contract. No second human approval is added after approval of the complete existing review.

## RD03 — Atomic native Apply, history and recovery

Apply enters the existing `WorldService.reviewedTransition` writer and command-receipt boundary. Reconcile an already committed identical receipt before admitting new effects. For new work, establish current create/inspect authority and the exact session/timeline, re-read the current selected draft and approved plan, and recompute the relevant dependency and live-impact binding before mutation. Preserve the existing world-lane/database ordering; preparation or receipt reads cannot introduce a competing writer or lock inversion.

Use one `admitStatusEffectPolicy` transition for the approved full candidate. Its native status owner ends ordinary effects using their old definitions, releases actual work, reconciles their occupied action and records real ending events. The policy and affected state commit with one durable receipt. Failure publishes neither a subset of deletions nor a success receipt. Do not loop independent per-record commits or reconstruct a character's old values. Preserve unrelated active conditions and work.

Queued intentions remain owned by the activity planner and face current native admission when selected; removing a definition does not delete unrelated plans or fabricate completion. Exercise the existing later-refusal behavior for a queued removed-condition command. Historical events, already changed quantities, completed actions, memories, learned knowledge and paid records remain. No semantic memory search, automatic rewriting or CE02 operation is introduced; normal newly emitted deactivation evidence follows the existing event/perception owners.

Review records stay in existing operational authoring storage; actual definitions/instances remain gameplay state. Current-format validation checks the post-apply instance/action relationships. Restart recovers the exact receipt and selected saved review without redispatch. After a gameplay load, pre-load cursors, late reads and pending reviews cannot operate on the replacement timeline even if IDs match. An authorized older gameplay load may restore those earlier definitions; the old receipt is historical and cannot authorize their fresh removal. Operational backup/recovery retains the existing session/receipt treatment. Add no old-format reader, automatic reset or snapshot-based undo.

## RD04 — Creator interaction and disclosure

Add **Review removal** to an inspected status definition and the existing status-policy work context, preserving the selected object and session. The plain heading names the condition; technical IDs remain secondary details. Use the existing Work/review layout, React Aria primitives and native results. Do not create a graph-canvas editor or separate administrative dashboard.

Required definitions show locked selection with an inline reason. Optional supporting conditions show ordinary labelled choices and a clear consequence when selected. A separate list names current affected people/objects and which condition/activity ends. Long names, multiple pages and empty instance groups remain readable; total selection stays visible when pages or filters change. Essential refusal text is reachable without focusing a disabled button. Pending reads preserve selection and reject late results from old choices or authority.

Use the existing exact approval and Apply controls. Keep cancel/close semantics distinct and restore focus to a surviving opener or stable result after removal. While an exclusive review is open, nested controls handle their own dismissal and the world cannot receive accidental keys/clicks/wheel input. Retain draft/reading position through narrow/short/enlarged-text adaptation. Success is the actual receipt; uncertain delivery provides **Check result** for the same operation, never an implicit new paid attempt or deletion.

Creator world inspection is separate from a character's knowledge. Use current create/inspect grants and existing private-human disclosure rules at both preparation and every returned page/late result. A privileged native validator may identify a protected blocker without returning its private records. If the complete destructive set cannot be adequately disclosed under current authority, block approval; do not publish hidden labels/counts or claim the visible subset is complete. NPC tools never receive the removal operation or creator-only evidence.

## Work growth, reuse and limits

Preparation cost grows with installed condition predicates/edges, selected closure size, affected entity instances and cold retained contributions. Optional selection adds closure recomputation; paging and readback grow with retained plan size. Apply needs one current eligibility/impact check and the existing owner transition. This is explicit creator work, not per-frame or per-tick processing.

Share typed predicate extraction and reverse adjacency once per exact installed policy. Reuse immutable definition preparation where its owner proves identity; mutable drafts rebuild. Gather relevant live condition facts once per analysis, not once per row or removed definition. Add the status-only indexed/batched read at the existing storage owner for the complete history required by native policy admission. Its work can grow with all retained condition history in the world, even when no selected definition is pinned; record that cost honestly. Inspect its actual PostgreSQL plan and work, including a no-pin result and large unrelated history, rather than treating a result limit as bounded database cost.

Invalidation follows policy membership/content, body/dream references, condition episode/binding membership, retained contribution revisions, authority and timeline. Clock-only changes do not rebuild definition topology. Page rendering uses already prepared immutable plan rows; no row triggers a new world scan or native validation. Existing source projections remain derived and reconstructible after restore.

Reuse current authoring payload, session/record retention, graph/read-page and transport envelopes where they fit. A complete plan exceeding them returns a capacity/narrower-operation outcome before approval; no top-K deletion set or silent eviction of an unresolved review. The current owners do not provide a separately qualified bound for aggregate removal analysis or plan growth. RD05 must measure and record the actual envelope and any required admission bound in [CE01 limits](../limits/creator-edits.md#ce01); this design invents no numeric capacity or latency guarantee. A bounded UI page is not a bound on preparation, retained bytes or mutation work.

## RD05 — Complete acceptance and evidence

Follow the feature's complete creator scenario through current native authoring, actual activation, real review controls, removal, continued play and PostgreSQL restart/save-load. Use the three-condition chain to demonstrate both transitive required deletion and keeping/removing its optional prerequisite. Add an object instance and a valid mutual-reference case to expose actor-only and tree-only assumptions. These are supported native scenarios, not proof of live model quality.

Demonstrate all of the feature acceptance cases, including every destructive entrypoint, unchanged surviving conditions, occupied work release, queued later refusal, body/dream blockers, active and cold contribution pins, newly incoming dependencies, stale selections/approvals, grant revocation during a read/write, inaccessible detail, lost acknowledgements, same-ID conflict/replay, rollback and abandoned-timeline publication. Native and browser evidence remain separately labelled.

Measure cold preparation, repeated unchanged preparation, an optional-selection change, first/later pages and final Apply through their actual callers. Grow definitions/edges, ordinary instances, retained contributions and unrelated history independently. Record definitions/edges/rows visited, SQL statement/query work, retained plan bytes and elapsed/application responsiveness, including a blocked operation. Existing static/build and focused checks follow AGENTS.md; this document does not require new test files or an unrelated full-suite expansion. Preserve explicit unrun accessibility/device/live-provider limits.

## Estimate, decisions and tradeoffs

Expect roughly **1,500–2,500 changed non-test logic lines**, plus contract/UI/documentation integration: a substantial cross-layer assignment with moderate-to-high integrity risk. This is a planning estimate, not a deadline. The main uncertainty is the cost of complete cold contribution checks and retained plan detail; existing broad history hydration is not evidence that the narrow path is already efficient.

The concrete consumer, optional-association meaning, native ending semantics, exact review/receipt owner and external blockers are selected here. No further product decision is required to implement this scoped assignment. It deliberately preserves existing definition-retention and body/dream requirements; a broader removal capability needs its own accepted lifecycle. The added review on destructive raw-policy changes is a consequential interface change required by CE01, trading a direct mutation for an inspectable approved operation. New numeric work limits, if needed, are engineering choices to justify from the actual caller and record with their limitations.

## Documentation and parent reconciliation

| Owner | Reconcile only this delivered scope |
| --- | --- |
| `docs/maintainers/creator-edits.md` CE01 and creator-edit-propagation project pair | Record this first supported condition-removal adapter and actual acceptance; retain general-family deletion and CE02 gaps. |
| `docs/status-effects.md`, `docs/invention-workshop-tools.md`, `docs/world-agent-runtime.md` | Describe exact removal preview, raw-policy routing, current creator controls, old-definition ending semantics and receipt recovery after delivery. |
| `docs/invention-graph.md`, `docs/maintainers/inventions-and-world-evolution.md` INV-15, INV-11 and INV-21 | Identify finite complete status-removal coverage while general graph impact/activation coverage remains open; update exact reviewed-write integration only. |
| Same tracker INV-5 and `docs/maintainers/extensible-world-foundation.md` EWF07 | Record the scoped native condition retirement/retained-pin behavior; do not close general law migration or risk-accepted incompatible changes. |
| `docs/save-and-load.md`, `docs/maintainers/save-and-load.md` SL00 | Reconcile any changed current-format review/receipt/state participation and actual restart/load proof without legacy support. |
| `docs/limits/creator-edits.md` CE01, reused invention/graph limits | Record supported roots/optional associations/blockers, measured work/retention envelopes and refusal; retain unresolved broader scale honestly. |
| `docs/maintainers/ui-ux.md` UIUX05 and `docs/architecture.md` | Record the selected real creator journey and new current behavior, not whole-interface or general accessibility acceptance. |

Keep the Batch 09 feature/design/prompt and [RD tracker](../maintainers/parallel-batch-09-reviewed-content-removal.md) consistent. Record actual runtime evidence under the existing verification-report policy and link it from these owners. Planning closes none of their runtime gates.

## Maintained records

- Feature and complete acceptance: [Reviewed condition removal](parallel-batch-09-reviewed-content-removal-feature-spec.md).
- Implementation: [RD01–RD05](../maintainers/parallel-batch-09-reviewed-content-removal.md); [standalone prompt](parallel-batch-09-reviewed-content-removal-prompts.md).
- Limits: [Creator edits CE01](../limits/creator-edits.md#ce01), with [invention limits](../limits/inventions.md) retaining shared envelopes.
- Accepted policy and related owners: [Creator propagation design](creator-edit-propagation-tech-design.md), [status effects](../status-effects.md), [graph](../invention-graph.md), [identity](../identity-and-references.md), [save/load](../save-and-load.md).
