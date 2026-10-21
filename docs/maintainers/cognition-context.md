# Situation-aware cognition context — implementation and qualification

**Status: Done — designed; core runtime implementation and qualification open · October 20, 2026.** The feature and technical specifications complete the commissioned context-construction design. This tracker owns its coordinated implementation stages, not a replacement memory, action, perception, identity, provider or evaluation subsystem. No runtime checkbox below is satisfied by the design or by character-count calculations.

## Maintained records

- Behavior and gameplay: [Feature specification](../projects/situation-aware-cognition-context-feature-spec.md).
- Implementation contracts and exact callers: [Technical design](../projects/situation-aware-cognition-context-tech-design.md).
- Supplied request, measurements, source findings and every conversation decision: [Evidence and decisions](../projects/situation-aware-cognition-context-evidence-and-decisions.md).
- All-repertoire coverage and selected positive gameplay cases: [Repertoire review](../projects/situation-aware-cognition-context-repertoire-review.md).
- Limits and policy decisions: [SCX01–SCX08](../limits/cognition.md#situation-aware-context-selection), alongside existing CG08/CG09 and source-specific bounds.
- Existing acceptance owners: [CR](cognition-redesign.md), [CE](character-experience.md), [IS](intelligent-simulation.md), [SPK](speech-and-social-perception.md), [NST](npc-speech-streaming.md), [CTR](combat-and-threat-responses.md), [PF](performance.md), [action experience](action-experience.md) and [agency](agent-agency.md).

## Selected scope and execution order

The selected change preserves complete accepted identity, all required actor-permitted evidence and exact name/description-to-ID references. It removes duplicate catalogs/manuals, inactive null payloads and irrelevant detail; discovers context from concurrent situations; closes selected dependencies; and avoids loading all state before choosing a small result. Speech and action can coexist. Suggestions never define the complete allowed action set. A rare implemented capability or low-priority repertoire idea may be essential evidence now.

**Core scope is SC01–SC11 on currently installed behavior.** The shared builder consumes the admitted decision's question/purpose, source-owned facts/dependencies and captured relevance policy. It has no fixed scenario taxonomy, category-turn allocation or benchmark-specific branch. Worked scenes demonstrate general information invariants and do not require their gameplay to be implemented. Preserve NST/CTR/SPK interfaces when separately installed; delivering those projects or their broader character/player gates is not a prerequisite. SC12 retains optional follow-up designs outside the core release dependency graph. Current revision fields, meaningful work modes and inline sparse definitions are sufficient for core completion.

- [x] Complete the feature/technical pair, recorded decisions, limits, source analysis, whole-repertoire review and concrete implementation breakdown.
- [ ] Implement the stages below through existing semantic owners, reconciling actual source before each change.
- [ ] Qualify the general builder through actual configured routes, current supported decisions and context invariants, then update current-contract statements and scoped release evidence. No broader gameplay or player result is claimed by this documentation.

| Stage | Work IDs | Start/finish relationship |
| --- | --- | --- |
| Capture the current complete request | SC01 | Foundation for measured implementation; no behavior-selection change needed to establish the baseline. |
| Remove structural duplication | SC03–SC04 | After SC01; integrate all current response consumers together. |
| Select detail from decision requirements | SC02/SC05 | Build against SC01; activate only when required closure, References and adequate existing detail access are complete. |
| Complete adapters and lifecycle | SC06–SC07 | Integrate changed contracts from SC02–SC05 and every current route. |
| Measure preparation and supported decisions | SC08–SC09 | Baseline planning starts with SC01; final comparisons use core SC02–SC08 on currently supported data. |
| Reconcile and release | SC10–SC11 | SC10 runs with every stage; SC11 consumes all applicable exits and preserves broader existing gates. |
| Optional follow-up: revision/mode echoes and local factoring | SC12 | Outside core release dependencies. If separately selected later, apply its concurrency/compatibility gates after the core sparse contract qualifies. |

Implementation follows the repository verification policy: prefer relevant existing fixtures/caller checks and representative ad-hoc verification; add new automated tests only when Mike asks. Acceptance cases specify behavior to demonstrate, not authorization to create test infrastructure. Paid qualification remains under the standing account authorization and per-task ceiling. This design-only assignment performs no runtime implementation or paid comparison.

## SC01 — Capture one preparation and the complete request

**Owner:** `decision-context.ts` with `ai-director.ts`, existing preparation/diagnostic/budget owners. **Design:** technical §§3–4, 6.1, 11. **Dependencies:** none; coordinate PF14 and CR01.

- [ ] Introduce the retained immutable actor/world/timeline/source/definition preparation and selected-source manifest. Preserve current behavior while recording required reasons, dependency keys, actual query coverage and exact bindings. Do not retain mutable world/draft/cache references across waits.
- [ ] Incorporate late appraisal and invention additions into the same finalized manifest before rendering, schema compilation and dispatch. Make diagnostics distinguish prepared, submitted, validated and committed states.
- [ ] Measure the current complete request by component, including instructions, response schema, References and any tool definitions/results. Keep UTF-8 bytes, transport bytes, local token estimates and provider usage separate.
- [ ] Trace one current attempt through its generated, captured, exported and provider-bound representations and compare exact bodies before classifying the supplied artifact's `type: null` discrepancy. Investigate the historical artifact's origin/revision; if it cannot be reproduced, record that limit rather than manufacturing malformed output or making unknown historical provenance a permanent release blocker. Do not fix a display/export anomaly by weakening the live validator.

**Exit:** representative existing decisions have traceable required sources, exact request/binding agreement and honest missing measurement fields. Use supported data, not a mandatory named scene list. Existing final schema/context/transport bounds remain intact. No additional generation or automatic paid repair is introduced.

## SC02 — Compose decision requirements and complete dependencies

**Owner:** the focused `decision-context-selection.ts` module and existing recall/attention/perception/work owners. **Design:** technical §§4–6. **Dependencies:** SC01; CR03/CR04 and CE03 remain semantic owners.

- [ ] Compose caller-, rule- and source-owned decision requirements from permitted data; union required facts and supported discovery cues without a fixed scene classifier. Preserve current identity/body/work/obligation/stimulus contracts, required outcomes, corrections and source-family identity. Installing content through existing definitions must not need a new scene-name branch.
- [ ] Preserve each installed source's eligibility before discovery, ranking, byte/row admission, exact required reads and hydration. If NST is separately installed, consume its terminal-readiness and frozen-hearing/current-authority contract, including an older occurrence becoming newly eligible on closure. Do not implement that subsystem to close SC02.
- [ ] Close required dependencies and test earliest reliable feasibility before optional hydration/attention/compaction. Missing required sources and genuine required overflow stop the affected generation; optional failure cannot demote them.
- [ ] Preserve bounded discovery/hard-query fallback and supported relevance under the captured cognition/world policy. Apply technical §6's deterministic selection and dependency accounting, including shared dependencies, cycles, nonfitting candidates and stable ties. Do not cycle fixed source families or treat unrelated raw scores as comparable. Admit only justified optional information and stop when none remains, even if space is free. Before activation implement §13.1's compiler meter and required fallback.
- [ ] Include supporting and contrary evidence, competing resource uses, personal interests and positive/quiet opportunities. Preserve partial/not-requested/unavailable/stale/forbidden distinctions; only a complete scoped query can establish scoped absence.
- [ ] Record actual examined coverage and omission reasons. Do not infer that a low score or an unexamined source proves irrelevance, or use repertoire Priority/Level/seed-world labels as attention scores.

**Exit:** combined requirements retain their required meaning, and new installed content needs no new scene template. Omission of one optional root cannot remove another retained root's dependency. Hidden-state changes do not change a request whose permitted evidence is unchanged. Qualify these invariants using existing sources and supported examples, not new gameplay.

## SC03 — Render meaning once and preserve References

**Owner:** `response-context.ts`, `entity-references.ts` and existing knowledge/spatial/capability projectors. **Design:** technical §7. **Dependencies:** SC01; coordinate SC02/SC05 before selectively omitting detail.

- [ ] Remove the exact duplicate installed activity catalog while retaining separate situation-specific choices. Derive concise semantic descriptions from installed definitions; exclude only UI fields that add no unique meaning.
- [ ] Replace the independently maintained field-by-field response manual with shared concise semantic instructions. Preserve eight operation meanings, admission versus completion, plan interruption, subjective goals, silence, exact references and compatible speech/action.
- [ ] Apply the benchmark-informed general rendering contract: separate the question/task from evidence, supply current native facts directly, and preserve relevant units, time, applicability, provenance, uncertainty and conditions with the fact or capability they qualify. Keep expected answers, grader rationale and scene labels outside model input; do not copy the benchmark's fixed scene fields or hypothetical rules.
- [ ] Remove redundant empty/null scaffolding and repeated source accounts while retaining meaningful absence, uncertainty, correction, quantities and participant roles. Use existing clock/precision owners rather than arbitrary formatter rounding.
- [ ] Build the complete selected reference closure before schema compilation. Preserve inventory-only mappings, same-name distinctions, remembered/current roles and every used namespace. Select permitted IDs before hashing; collisions cannot alias subjects or require a world scan.

**Exit:** each selected fact and necessary mapping occurs in an adequate form exactly where needed; no duplicated form/manual remains. Every schema/description/output reference resolves through the same captured binding. A remembered person is not automatically a current physical target.

## SC04 — Implement sparse strict response contracts

**Owner:** `cognition-contracts.ts`, `navigation-contracts.ts`, exported payload schemas and `packages/domain/src/response.ts` with all current producers/consumers. **Design:** technical §9. **Dependencies:** SC01; integrate with SC03/SC06/SC07.

- [ ] Preserve all eight logical operation kinds and common metadata in the actual installed envelope. Core SC can ship the sparse `operations` contract with current revision/mode fields. If NST is separately delivered, compose its sole `records` root with sparse non-speech payloads and no inactive `talk: null`. Keep genuine null meanings; no dual generation reader remains after that independent cutover.
- [ ] Implement exact nested known/expression/proposal/invoke, goal, plan and appraisal alternatives. Bind installed family and its own parameters in one closed alternative. Preserve `interrupt`, actual prior-step outputs and distinct purposes/work modes.
- [ ] Replace envelope `.shape.*` assumptions with shared exported payload schemas. Update native-known responses, reflection reuse, response resolution/admission, escalation/reconsideration, fixtures and diagnostic labels together; retain no old padded parser.
- [ ] Confirm multiple/repeated operations, empty responses, earlier-only admission dependencies and independent partial receipts through current parsers and native callers. Reject mixed payloads, including talk+appraise in the current private preview. When NST is installed, preserve its exact parser/normalization/publication barriers without turning their separate delivery into an SC prerequisite.

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
- [ ] When NST is installed, include its record wrapper, complete generated document, independently bounded normalized logical response and actual screening executions through their existing owners. Qualify its exact records path and answered/reason-null `q0` gate where applicable. Listener fan-out is not generation; unknown costs remain explicit. Do not add screening or streaming delivery to this task.
- [ ] Preserve exact frozen schema/request bytes across asynchronous calls and local validation. Remove adapter-added duplicate prose or envelopes; verify each real API wrapper without substituting a newer vendor API.
- [ ] Arrange genuinely stable instructions before dynamic evidence where supported; preserve exact scoped reference enums initially. Report actual cache usage rather than predicting hits from a stable first paragraph.
- [ ] Integrate direct OpenAI, Macrofold direct generation, supported full-generation callers, native/fixture generated values and decision reconsideration. Preserve route-specific parameter forwarding, refusals, uncertainty and no automatic paid repair.

**Exit:** each configured route sends the intended complete contract, respects all current budget gates and reports honest actual/estimated/unknown costs. Fewer displayed lines, cached tokens and removed input tokens remain distinct claims.

## SC07 — Preserve freshness, previews, receipts and restoration

**Owner:** existing decision/publication/admission, identity, speech-preview, evidence and save/load owners. **Design:** technical §12. **Dependencies:** SC01/SC04; integrate SC06. Core qualification preserves current revision/mode behavior. Optional SC12 has its own affected requalification if separately selected later; it is not an SC07 prerequisite.

- [ ] Revalidate exact affected sources/authority after asynchronous preparation and before disclosure/each native operation. Preserve historical time; unrelated changes do not invalidate everything, while correction/forgetting/revocation/restore cannot reuse stale snippets.
- [ ] Preserve the current private-preview contract and retired UI scope. When NST is separately installed, consume its replacement public speech owner and exact parsing, screening, barriers and frozen hearing; do not restore or keep a competing reader. NST owns implementing that cutover.
- [ ] Preserve per-component effects and receipts when a later independent operation fails. Unvalidated strings/private preview create no world speech; generated non-speech operations require complete typed validation. Where NST is installed, retain its accepted interrupted prefixes and progress fence against replacement/reconsideration/escalation. Retry/restore cannot repeat accepted effects or spending under either installed contract.
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

## SC09 — Qualify informed decisions on supported data

**Owner:** existing CR12/AG12 evaluation mechanisms, with CE05/IS09 retaining broader character/player work. **Design:** feature §12, technical §15 and the benchmark evidence record. **Dependencies:** baseline with SC01; final comparison after core SC02–SC08. No SC12, unimplemented scene or adjacent-project release prerequisite.

- [ ] Use matched permitted snapshots of existing supported decisions with the same identity, model/effort, installed rules and clock conditions. Capture baseline/revised requests, actual evidence availability and complete operating costs. Reuse recorded successful benchmark cases where informative, distinguishing synthetic input from real-source preparation.
- [ ] Exercise required closure, combined independent requirements, materially conflicting facts, units/time/reference meaning, incomplete coverage, irrelevant-data growth and installed-operation preservation. Use current data or clearly labeled synthetic units; do not implement the repertoire scenes to satisfy this checkbox.
- [ ] Record required-context omissions, incorrect identities/quantities/uncertainty, lost alternatives, unnecessary inspection burden, failed/abandoned decisions and later consequences. Preserve contrary results and unfinished/uncertain calls.
- [ ] Compare factual/constraint correctness and supported decision quality separately from schema validity and subjective tone. Keep original references, failures and post-run amendments visible; never feed expected answers to the model. Permit several valid open-ended choices. CTR's Ada counterattack and broader human-enjoyment acceptance remain in their owning projects, not SC release gates.

**Exit:** generic coverage/meaning invariants pass and revised context preserves known supported decisions with evidence for the enabled scope. Record omissions or material regressions as builder defects. Synthetic successes do not prove real retrieval completeness or player enjoyment. No token/latency/cost benefit is inferred from formatting alone; paid comparisons retain existing account authorization and task ceilings.

## SC10 — Reconcile current consumers and documentation at each stage

**Owner:** implementation author with canonical CR/CE/IS/action/identity/provider/world owners. **Design:** technical §14.1 and feature §14. **Dependencies:** continuous with each stage; final closure after applicable runtime exits.

- [ ] Search all current operation/context/schema consumers before each contract change; update them coherently rather than retaining an old reader. Distinguish historical evidence from actual current behavior.
- [ ] Keep memory, identity, actions, provider, limits and focused trackers consistent. Preserve SPK's structured evidence, NST's sole final record/publication/readiness owner and CTR's exact selected scope, including two stages only for its threat route and all required post-appraisal evidence. Coordinate NST's operation-record row with the sparse payload owner so it does not require inactive padding.
- [ ] Record delivery/evidence only when demonstrated; retain unrelated open CR/CE/ND/PF tasks. Update relevant fixtures, inspector labels, instructions version and significant changelog decisions with their actual scope.

**Exit:** no maintained document tells an implementer both to preserve and remove the same runtime field without a clearly labeled stage. Design-only completion never checks an unrun runtime or player gate. The repertoire remains design inspiration, not injected prompt content or an alternate action registry.

## SC11 — Enable a coherent current contract after qualification

**Owner:** existing release, job/admission, provider and verification owners. **Design:** technical §14. **Dependencies:** applicable core SC01–SC10 exits on currently installed behavior. SC12 and unimplemented NST/CTR/SPK/gameplay work are not prerequisites; existing CI and actual release requirements remain.

- [ ] Qualify the actual configured routes and retained request/response shapes in a bounded enabled scope. Do not infer direct-provider/full-harness compatibility from a Macrofold fixture.
- [ ] Use existing admission/cancellation/receipt semantics to stop old-contract job admission and fence uncommitted old results before enabling the new contract. Preserve accepted effects, liabilities and uncertain external work; no indefinite wait or replayed paid request.
- [ ] Record the exact implementation revision, enabled world/route scope, reused versus new evidence and remaining measured limitations. Preserve same-version reopening and existing release requirements.

**Exit:** current implementation, current docs, route qualification and enabled behavior agree. Rollout is a future implementation action, not performed by this design task. A conditional local-reference optimization may remain off without blocking the otherwise complete inline contract.

## SC12 — Bind derivable metadata; optionally factor local schemas

**Status: Designed, deferred optional follow-up; outside core SC delivery.** Current expected revisions, meaningful mode fields and inline sparse schemas are the core contract. No item in SC12 must be implemented or evaluated to close SC11.

**Owner:** prepared response bindings, native mutation/receipt owners, installed-request definitions and AI schema validator. **Design:** technical §§9.5–10. **Dependencies if separately selected:** qualified SC04/SC07, followed by affected lifecycle requalification; integrate current callers through SC06/SC10.

### Optional follow-up: revisions and one work mode

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

The selected core context design is **Done — designed**. Duplicate forms/manuals, sparse current responses, general source/detail selection, required closure, exact References and complete accounting have an implementation contract. SC12 preserves optional metadata/schema ideas without expanding core delivery. Existing CR01/CR03/CR04/CR12, CE03–CE05, IS02/IS06/IS09 and PF/C17 work retains its own broader acceptance; the repertoire scenes are illustrative.

The ordinary-context portion related to ND20/DG04 is designed here; optional richer retrieval, immediate model detail tools, long-term personality/older-memory transformation, broader hearing, rescue/afterlife, control customization, world economics and service scale remain under their actual conditional/selected owners. This tracker neither reopens already designed SPK/CTR work nor closes an ND umbrella.

### Documentation verification — October 19, 2026

The final design-only comparison against `main` at `a612eecf43d225b5f9087287573ec3e054641cf9` covers 46 changed/new Markdown documents: 41 existing documents and five new records. The runtime source/attachment audit remains pinned to `0b1262a597ca718be54c287eea0619b073952f32`; reconciliation adds the selected NST owner and its targeted sparse operation-record coordination without relabeling that original evidence. The prior full-document checks and bounded final coordination review resolve all newly introduced relative paths/anchors, including the 16 new NST-related targets. All five new records state their design/runtime status and maintained owners; SC01–SC12 and SCX01–SCX08 each have exactly one definition.

All 657 pre-existing checkbox states across the seven changed existing maintainer records remain unchanged relative to their applicable delivery base. This new tracker has 56 checkboxes: 54 unchecked and two checked decisions concerning design completion and the inline sparse-schema default. No runtime delivery is checked. An independent affected-document review confirms one final records contract, preserved logical operations, terminal-only semantic evidence, historical hearing/current authority, durable speech and complete accounting across the combined owners.

The repertoire comparison covers all 42 files and preserves all 8,257 catalogue entry identities, order and non-behavior metadata. Its recorded outcome is 26 changed files and 16 deliberate retentions. The supplied-request calculations were independently recomputed, including the exact descriptor duplicate, retained choice/reference meanings, sparse-schema sizes and exported null-type anomaly. These checks establish documentation consistency and local measurements; implementation, configured-provider behavior, performance and player enjoyment retain their separate open gates.

No runtime files or test code were changed for this design assignment. No paid OpenLegend/provider calls were made: additional Jev cost **$0**, cumulative task Jev cost **$0**. That accounting excludes the coding assistant's own subscription/usage and is not a prediction of future runtime cost.
