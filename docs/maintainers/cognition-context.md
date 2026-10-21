# Situation-aware cognition context — implementation and qualification

**Status: Done — designed; runtime implementation and qualification open · October 19, 2026.** The feature and technical specifications complete the commissioned context-reduction design. This tracker owns its coordinated implementation stages, not a replacement memory, action, perception, identity, provider or evaluation subsystem. No runtime checkbox below is satisfied by the design or by character-count calculations.

## Maintained records

- Behavior and gameplay: [Feature specification](../projects/situation-aware-cognition-context-feature-spec.md).
- Implementation contracts and exact callers: [Technical design](../projects/situation-aware-cognition-context-tech-design.md).
- Supplied request, measurements, source findings and every conversation decision: [Evidence and decisions](../projects/situation-aware-cognition-context-evidence-and-decisions.md).
- All-repertoire coverage and selected positive gameplay cases: [Repertoire review](../projects/situation-aware-cognition-context-repertoire-review.md).
- Limits and policy decisions: [SCX01–SCX08](../limits/cognition.md#situation-aware-context-selection), alongside existing CG08/CG09 and source-specific bounds.
- Existing acceptance owners: [CR](cognition-redesign.md), [CE](character-experience.md), [IS](intelligent-simulation.md), [SPK](speech-and-social-perception.md), [NST](npc-speech-streaming.md), [CTR](combat-and-threat-responses.md), [PF](performance.md), [action experience](action-experience.md) and [agency](agent-agency.md).

## Selected scope and execution order

The selected change preserves complete accepted identity, all required actor-permitted evidence and exact name/description-to-ID references. It removes duplicate catalogs/manuals, inactive null payloads and irrelevant detail; discovers context from concurrent situations; closes selected dependencies; and avoids loading all state before choosing a small result. Speech and action can coexist. Suggestions never define the complete allowed action set. A rare implemented capability or low-priority repertoire idea may be essential evidence now.

- [x] Complete the feature/technical pair, recorded decisions, limits, source analysis, whole-repertoire review and concrete implementation breakdown.
- [ ] Implement the stages below through existing semantic owners, reconciling actual source before each change.
- [ ] Qualify the integrated route and meaningful gameplay, then update current-contract statements and release evidence. No native, live-provider or player result is claimed by this documentation.

| Stage | Work IDs | Start/finish relationship |
| --- | --- | --- |
| Capture the current complete request | SC01 | Foundation for measured implementation; no behavior-selection change needed to establish the baseline. |
| Remove structural duplication | SC03–SC04 | After SC01; integrate all current response consumers together. |
| Select detail from concurrent situations | SC02/SC05 | Build against SC01; activate only when required closure, References and usable inspection are complete. |
| Complete adapters and lifecycle | SC06–SC07 | Integrate changed contracts from SC02–SC05 and every current route. |
| Remove derivable revision/mode echoes | Selected portion of SC12 | After sparse response/lifecycle qualification, before final integrated acceptance. |
| Measure actual preparation and play | SC08–SC09 | Baseline planning starts with SC01; final comparisons use the integrated enabled stages, including selected SC12 metadata binding. |
| Reconcile and release | SC10–SC11 | SC10 runs with every stage; SC11 consumes all applicable exits and preserves broader existing gates. |
| Consider local schema factoring | Conditional portion of SC12 | Only after sparsity measurements; retaining inline definitions is the selected default when benefit/support is unproved. |

Implementation follows the repository verification policy: prefer relevant existing fixtures/caller checks and representative ad-hoc verification; add new automated tests only when Mike asks. Acceptance cases specify behavior to demonstrate, not authorization to create test infrastructure. Paid qualification remains under the standing account authorization and per-task ceiling. This design-only assignment performs no runtime implementation or paid comparison.

## SC01 — Capture one preparation and the complete request

**Owner:** `decision-context.ts` with `ai-director.ts`, existing preparation/diagnostic/budget owners. **Design:** technical §§3–4, 6.1, 11. **Dependencies:** none; coordinate PF14 and CR01.

- [ ] Introduce the retained immutable actor/world/timeline/source/definition preparation and selected-source manifest. Preserve current behavior while recording required reasons, dependency keys, actual query coverage and exact bindings. Do not retain mutable world/draft/cache references across waits.
- [ ] Incorporate late appraisal and invention additions into the same finalized manifest before rendering, schema compilation and dispatch. Make diagnostics distinguish prepared, submitted, validated and committed states.
- [ ] Measure the current complete request by component, including instructions, response schema, References and any tool definitions/results. Keep UTF-8 bytes, transport bytes, local token estimates and provider usage separate.
- [ ] Trace one current attempt through its generated, captured, exported and provider-bound representations and compare exact bodies before classifying the supplied artifact's `type: null` discrepancy. Investigate the historical artifact's origin/revision; if it cannot be reproduced, record that limit rather than manufacturing malformed output or making unknown historical provenance a permanent release blocker. Do not fix a display/export anomaly by weakening the live validator.

**Exit:** a greeting, supplies decision, promise and hazard have traceable required sources, exact request/binding agreement and honest missing measurement fields. Existing final schema/context/transport bounds remain intact. No additional generation or automatic paid repair is introduced.

## SC02 — Select concurrent situations and complete dependencies

**Owner:** the focused `decision-context-selection.ts` module and existing recall/attention/perception/work owners. **Design:** technical §§4–6. **Dependencies:** SC01; CR03/CR04 and CE03 remain semantic owners.

- [ ] Collect independent actor-permitted situation signals and union their required facts. Preserve current identity/body/work/obligation/stimulus contracts, required personal outcomes, corrections and source-family identity.
- [ ] Apply NST terminal readiness before speech discovery, ranking, byte/row admission, exact required reads, hydration and every semantic derivative. Closure of an older occurrence makes its permitted completed/interrupted evidence newly eligible once without rewriting chronology. Preserve its frozen historical hearing and current disclosure/forgetting/timeline fences.
- [ ] Close required dependencies and test earliest reliable feasibility before optional hydration/attention/compaction. Missing required sources and genuine required overflow stop the affected generation; optional failure cannot demote them.
- [ ] Preserve existing bounded discovery/hard-query fallback and source-specific relevance. Apply the exact deterministic ordering and incremental dependency-accounting algorithm in technical §6, including shared dependencies, cycles, nonfitting candidates and stable ties. Before activation, implement technical §13.1's request-local compiler meter and finalized required fallback; the guard is part of SC02 delivery, not postponed until the later performance comparison.
- [ ] Include supporting and contrary evidence, competing resource uses, personal interests and positive/quiet opportunities. Preserve partial/not-requested/unavailable/stale/forbidden distinctions; only a complete scoped query can establish scoped absence.
- [ ] Record actual examined coverage and omission reasons. Do not infer that a low score or an unexamined source proves irrelevance, or use repertoire Priority/Level/seed-world labels as attention scores.

**Exit:** mixed speech/work/threat contexts retain all required meaning; quiet and creative cases retain useful discovery. Omission of one optional root cannot remove a dependency of another retained root. Hidden-state changes do not change a request whose permitted evidence is unchanged.

## SC03 — Render meaning once and preserve References

**Owner:** `response-context.ts`, `entity-references.ts` and existing knowledge/spatial/capability projectors. **Design:** technical §7. **Dependencies:** SC01; coordinate SC02/SC05 before selectively omitting detail.

- [ ] Remove the exact duplicate installed activity catalog while retaining separate situation-specific choices. Derive concise semantic descriptions from installed definitions; exclude only UI fields that add no unique meaning.
- [ ] Replace the independently maintained field-by-field response manual with shared concise semantic instructions. Preserve eight operation meanings, admission versus completion, plan interruption, subjective goals, silence, exact references and compatible speech/action.
- [ ] Remove redundant empty/null scaffolding and repeated source accounts while retaining meaningful absence, uncertainty, correction, quantities and participant roles. Use existing clock/precision owners rather than arbitrary formatter rounding.
- [ ] Build the complete selected reference closure before schema compilation. Preserve inventory-only mappings, same-name distinctions, remembered/current roles and every used namespace. Select permitted IDs before hashing; collisions cannot alias subjects or require a world scan.

**Exit:** each selected fact and necessary mapping occurs in an adequate form exactly where needed; no duplicated form/manual remains. Every schema/description/output reference resolves through the same captured binding. A remembered person is not automatically a current physical target.

## SC04 — Implement sparse strict response contracts

**Owner:** `cognition-contracts.ts`, `navigation-contracts.ts`, exported payload schemas and `packages/domain/src/response.ts` with all current producers/consumers. **Design:** technical §9. **Dependencies:** SC01; integrate with SC03/SC06/SC07.

- [ ] Preserve all eight logical operation kinds and common metadata. Compose the final strict provider contract with NST's sole `records` root: speech start/text/end records and seven sparse flattened non-speech alternatives, with no inactive `talk: null` or sibling payloads. Keep genuine declared null meanings. An operations-root stage is allowed only before NST's coordinated cutover; no dual generation reader remains afterward.
- [ ] Implement exact nested known/expression/proposal/invoke, goal, plan and appraisal alternatives. Bind installed family and its own parameters in one closed alternative. Preserve `interrupt`, actual prior-step outputs and distinct purposes/work modes.
- [ ] Replace envelope `.shape.*` assumptions with shared exported payload schemas. Update native-known responses, reflection reuse, response resolution/admission, escalation/reconsideration, fixtures and diagnostic labels together; retain no old padded parser.
- [ ] Confirm multiple and repeated logical operations, deliberate empty responses, earlier-only admission dependencies and independent partial receipts through NST's exact record parser, normalization and publication barriers. Reject a mixed payload and preserve full validation for generated non-speech response operations. The inspected private-preview talk+appraise rejection remains an earlier-stage qualification; it is not the final public speech protocol.

**Exit:** every enabled current operation passes the real schema/serialization/parser/reference/native path with the intended effects/refusals; the first sparse delivery retains existing revision fields. Provider dialect is qualified separately from local schema calculations. No talk-only shortcut based on a speech trigger removes valid actions.

## SC05 — Provide concise capability discovery and usable detail access

**Owner:** installed request/known-method/inspection owners, `navigation-contracts.ts`, action choice/preparation and existing native inspection. **Design:** technical §8 and §9.3. **Dependencies:** SC01/SC02; consume SC03/SC04.

- [ ] Produce current full invocation details where a capability may materially affect the decision; otherwise use a concise useful description with a real exact detail-returning route where omission is allowed. A generic proposal or information-needed result is not a detail-fetch route. Proposal grounding may replace optional invocation syntax only when initial facts already support an informed exact intention and the resolver preserves every material qualifier.
- [ ] Preserve required parameters, meanings, units, deadlines, tradeoffs, exact resource references and native purpose/work transitions. Exclude form layout/button metadata only after preserving any unique semantic label.
- [ ] Preserve own-inventory, inspected-container and learned-activity continuation scope, current access, nested-container guards, source revisions and actual cost/time. A partial page is not the whole inventory/history.
- [ ] Keep necessary detail in the first request whenever inspection is unavailable, would require guessing, or would create a material tactical/ordinary-play burden. Preserve the unlisted attempt and actual unsupported/information-needed outcomes.

**Exit:** a shortened descriptor never hides a required urgent alternative or turns a suggestion into authority. Missing detail can be obtained through the route actually implemented, not an imagined future API. Immediate cognition gains no mandatory tool/model round; new private-recall tools retain CR04/CR08/CH01's conditional gate.

## SC06 — Account and serialize across every provider route

**Owner:** AI director/budget and current `packages/ai`/Macrofold adapters. **Design:** technical §11. **Dependencies:** SC01/SC03/SC04; selected SC02/SC05 representations.

- [ ] Measure/admit the complete finalized input, output allowance, schema and transport under existing limits. Include embeddings, attention, compaction, selected threat stages and configured reconsideration in complete cost reporting through existing owners.
- [ ] Include NST's record wrapper, complete generated document, independently bounded normalized logical response and every actual screening execution in their existing size/cost owners. Qualify the exact request-bound records path and the answered/reason-null `q0` gate where applicable. Listener fan-out is not a separate generation; unknown screening/provider cost remains explicit.
- [ ] Preserve exact frozen schema/request bytes across asynchronous calls and local validation. Remove adapter-added duplicate prose or envelopes; verify each real API wrapper without substituting a newer vendor API.
- [ ] Arrange genuinely stable instructions before dynamic evidence where supported; preserve exact scoped reference enums initially. Report actual cache usage rather than predicting hits from a stable first paragraph.
- [ ] Integrate direct OpenAI, Macrofold direct generation, supported full-generation callers, native/fixture generated values and decision reconsideration. Preserve route-specific parameter forwarding, refusals, uncertainty and no automatic paid repair.

**Exit:** each configured route sends the intended complete contract, respects all current budget gates and reports honest actual/estimated/unknown costs. Fewer displayed lines, cached tokens and removed input tokens remain distinct claims.

## SC07 — Preserve freshness, previews, receipts and restoration

**Owner:** existing decision/publication/admission, identity, speech-preview, evidence and save/load owners. **Design:** technical §12. **Dependencies:** SC01/SC04; integrate SC06. First qualify the sparse-stage lifecycle to enable SC12, then rerun the affected boundaries after SC12 for the final integrated exit. This avoids treating SC07 and SC12 as circular prerequisites.

- [ ] Revalidate exact affected sources/authority after asynchronous preparation and before disclosure/each native operation. Preserve historical time; unrelated changes do not invalidate everything, while correction/forgetting/revocation/restore cannot reuse stale snippets.
- [ ] Preserve the inspected private-preview stage's complete strict independent talk checks and retired UI scope. At NST cutover, replace its public NPC attachment with the sole shared speech owner, exact closed-record parsing, screening, ordered barriers and per-utterance frozen hearing; do not restore or keep a competing public preview reader.
- [ ] Preserve per-component effects and receipts when a later independent operation fails. Unvalidated strings and private preview create no world speech; generated non-speech response operations await complete typed validation. Already screened and durably accepted NST words survive as interrupted speech. Speech progress fences replacement/reconsideration/escalation before the whole-response receipt exists; retries/restore cannot repeat accepted speech, output or spending.
- [ ] Keep compiler/manifest/cache state derived. Same-version restoration preserves actual identity, chosen work, obligations and outcomes while fencing old timeline results and preserving real external spending uncertainty.

**Exit:** meaningful source changes, benign changes, mixed independent refusals, late cancellation and restoration exercise the real caller boundary. Native work continues under its owner when an AI preparation fails. No new scheduler, replay authority or legacy-save adapter is created.

## SC08 — Make preparation grow with relevant work

**Owner:** PF09/PF14/C17 and existing observation/query/reference/capability owners. **Design:** technical §13. **Dependencies:** SC01 instrumentation; SC02/SC05 for selected preparation.

- [ ] Replace whole-world reference hashing and full-inventory-before-page preparation with scoped ID/size selection and required exact lookups. Preserve equipped and already-bound tools/resources.
- [ ] Reuse immutable definition/schema fragments and shared native checks without merging different purposes or audiences. Use existing caches only with complete relevant invalidation and bounded retention.
- [ ] Qualify the pure request-local compiler guard from technical §13.1 against existing `WORK_LIMITS.group` ceilings: pre-allocation checks, repeated shared-subgraph fits, long common key prefixes, dense/cyclic graphs and semantic dependency chains longer than 32. Confirm deterministic optional exhaustion preserves the current required fallback and required-source changes invalidate it, with no native work-state mutation or world pause.
- [ ] Measure metadata visits, query plans, hydration, dependency fan-out, schema fragments, exact native checks, complete request construction and retained memory. Record cumulative compiler counters and actual heap/RSS/latency separately. A `LIMIT`, short output, encoded-byte allowance or warm helper timing is insufficient.
- [ ] Compare unchanged local scenes with growing irrelevant world population, then separately grow relevant neighbors, possessions, methods and cold history. Include actual active callers, changed access/definitions and restore.

**Exit:** demonstrated unnecessary preparation growth is removed without losing required or discoverable meaning. Remaining necessary growth/refusal/coverage is explicit; no arbitrary new item/goal/personality cap is introduced to make a benchmark pass.

## SC09 — Qualify informed decisions and enjoyable complete activities

**Owner:** CR12/CE05/AG12/IS09 and existing evaluation specifications. **Design:** feature §§11–12, technical §15 and repertoire review. **Dependencies:** baseline with SC01; final comparison after integrated SC02–SC08 and selected SC12.

- [ ] Use matched permitted snapshots/whole episodes with the same identity, model/effort, installed rules and clock conditions. Capture baseline and revised requests, actual evidence availability and full operating costs.
- [ ] Exercise ordinary greeting/work, supply/making, conflict, promises/withdrawal, old clues, creative substitutions, personal keepsakes, leisure after success, independent detours and quiet continuation.
- [ ] Record required-context omissions, incorrect identities/quantities/uncertainty, lost alternatives, unnecessary inspection burden, failed/abandoned decisions and later consequences. Preserve contrary results and unfinished/uncertain calls.
- [ ] Evaluate coherent individual choices and readable/fun play separately from schema/native correctness. General comparisons permit several valid choices; CTR's specifically required independently chosen Ada physical counterattack remains a separate required acceptance case.

**Exit:** required coverage invariants pass and existing quality/episode owners have actual evidence for the enabled scope, including useful later outcomes. No percentage/token/latency/enjoyment claim is made solely from synthetic schema size. Paid qualification uses existing explicit account authorization and task ceilings.

## SC10 — Reconcile current consumers and documentation at each stage

**Owner:** implementation author with canonical CR/CE/IS/action/identity/provider/world owners. **Design:** technical §14.1 and feature §14. **Dependencies:** continuous with each stage; final closure after applicable runtime exits.

- [ ] Search all current operation/context/schema consumers before each contract change; update them coherently rather than retaining an old reader. Distinguish historical evidence from actual current behavior.
- [ ] Keep memory, identity, actions, provider, limits and focused trackers consistent. Preserve SPK's structured evidence, NST's sole final record/publication/readiness owner and CTR's exact selected scope, including two stages only for its threat route and all required post-appraisal evidence. Coordinate NST's operation-record row with the sparse payload owner so it does not require inactive padding.
- [ ] Record delivery/evidence only when demonstrated; retain unrelated open CR/CE/ND/PF tasks. Update relevant fixtures, inspector labels, instructions version and significant changelog decisions with their actual scope.

**Exit:** no maintained document tells an implementer both to preserve and remove the same runtime field without a clearly labeled stage. Design-only completion never checks an unrun runtime or player gate. The repertoire remains design inspiration, not injected prompt content or an alternate action registry.

## SC11 — Enable a coherent current contract after qualification

**Owner:** existing release, job/admission, provider and verification owners. **Design:** technical §14. **Dependencies:** all applicable SC exits, including selected SC12 metadata work; broader current CI/release gates remain.

- [ ] Qualify the actual configured routes and retained request/response shapes in a bounded enabled scope. Do not infer direct-provider/full-harness compatibility from a Macrofold fixture.
- [ ] Use existing admission/cancellation/receipt semantics to stop old-contract job admission and fence uncommitted old results before enabling the new contract. Preserve accepted effects, liabilities and uncertain external work; no indefinite wait or replayed paid request.
- [ ] Record the exact implementation revision, enabled world/route scope, reused versus new evidence and remaining measured limitations. Preserve same-version reopening and existing release requirements.

**Exit:** current implementation, current docs, route qualification and enabled behavior agree. Rollout is a future implementation action, not performed by this design task. A conditional local-reference optimization may remain off without blocking the otherwise complete inline contract.

## SC12 — Bind derivable metadata; optionally factor local schemas

**Owner:** prepared response bindings, native mutation/receipt owners, installed-request definitions and AI schema validator. **Design:** technical §§9.5–10. **Dependencies:** SC04 and SC07's sparse-stage lifecycle qualification, followed by affected SC07 requalification after this stage; integrate all current callers through SC06/SC10.

### Selected later stage: revisions and one work mode

- [ ] Capture exact target existence/revision/read dependencies, then remove echoed expected revisions from model-facing goal/plan/note/name operations and redundant reference fields. Native mutations still receive and check captured expected revisions; current decision appraisals already have their own server-bound precedent.
- [ ] Require full current text or authoritative absence for a replacement note, sufficient current objective for a goal revision, and a legitimately resolved subject for naming. A missing binding never means revision zero or permission to overwrite unseen state.
- [ ] Maintain a response-local last-accepted-writer table. A subsequent same-target edit may use its actual new revision only when it explicitly depends on that last writer; independent sibling writes retain the captured expectation and refuse if stale. Preserve failed/dependent/created-alias cases exactly as technical §10 specifies.
- [ ] Remove only an installed request's explicitly declared duplicate work-transition field, deriving it from the single selected `act.mode`. Independent mode-like parameters retain their meanings; mismatched unsupported transitions refuse before costs.

**Exit:** stale external edits cannot be overwritten, explicit same-reply dependencies work without guessing revisions, and note clearing/creation/replacement retain their intended scope. All current producers and consumers change together; no legacy wire reader is retained.

### Conditional refinement: local schema references

- [x] Choose inline sparse definitions as the initial/default contract; provider support alone is insufficient to enable local references.
- [ ] Measure complete remaining duplication after sparsity. Record either a justified decision to retain inline definitions or an admitted local-reference implementation with exact configured-route evidence.
- [ ] If adopted, permit only the bounded captured-schema local nonrecursive subset specified in technical §9.5. Reject external/missing/cyclic/dynamic forms locally, retain strict validation through references and update every adapter/parser/preview consumer. Do not build an external schema loader.

**Exit:** one current schema generator remains, with proven equivalent allowed meaning and a measured net benefit if references are enabled. A historical size sketch is neither a target nor evidence of compatibility.

## Design disposition and evidence boundary

The selected context design is **Done — designed**. The design-specific gaps underlying duplicated forms/manuals, sparse responses, dynamic source/detail selection, required closure, exact reference preservation, source-bound metadata and complete accounting now have an implementation contract. Existing CR01/CR03/CR04/CR12, CE03–CE05, IS02/IS06/IS09 and PF/C17 work retains its own broader acceptance.

The ordinary-context portion related to ND20/DG04 is designed here; optional richer retrieval, immediate model detail tools, long-term personality/older-memory transformation, broader hearing, rescue/afterlife, control customization, world economics and service scale remain under their actual conditional/selected owners. This tracker neither reopens already designed SPK/CTR work nor closes an ND umbrella.

### Documentation verification — October 19, 2026

The design-only comparison against `0b1262a597ca718be54c287eea0619b073952f32` covers 45 changed/new Markdown documents: 40 existing documents and five new records. Newly introduced relative paths/anchors resolve against the edited tree or the pinned baseline. All five new records state their design/runtime status and maintained owners; SC01–SC12 and SCX01–SCX08 each have exactly one definition. All 657 pre-existing checkbox states across the changed maintainer records remain unchanged. The two checked decisions in this new tracker concern design completion and the inline sparse-schema default, not runtime delivery.

The repertoire comparison covers all 42 files and preserves all 8,257 catalogue entry identities, order and non-behavior metadata. Its recorded outcome is 26 changed files and 16 deliberate retentions. The supplied-request calculations were independently recomputed, including the exact descriptor duplicate, retained choice/reference meanings, sparse-schema sizes and exported null-type anomaly. These checks establish documentation consistency and local measurements; implementation, configured-provider behavior, performance and player enjoyment retain their separate open gates.

No runtime files or test code were changed for this design assignment. No paid OpenLegend/provider calls were made: additional Jev cost **$0**, cumulative task Jev cost **$0**. That accounting excludes the coding assistant's own subscription/usage and is not a prediction of future runtime cost.
