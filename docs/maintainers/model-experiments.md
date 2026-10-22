# Hugging Face model experiments — implementation and qualification

**Status: Done — designed; runtime implementation, hosting qualification, comparisons and adoption open · October 22, 2026.** This tracker owns OpenLegend's deployment-target consumer and the selected experiment preparation. Macrofold owns generic hosting, artifacts, credentials, lifecycle and allocation accounting. No unchecked delivery item is satisfied by a design, mocked response or popular model label.

## Maintained records

- Behavior and journeys: [Feature specification](../projects/model-experiments-feature-spec.md).
- Exact consumer mapping, implementation plan and evaluation protocol: [Technical design](../projects/model-experiments-tech-design.md).
- Constraints and extension triggers: [MX-L01–MX-L08](../limits/model-experiments.md).
- Shared external protocol: [Macrofold deployment contract](https://github.com/Macrofold/Macrofold/blob/design/huggingface-model-deployments-2026-10-22/docs/projects/hugging-face-model-deployments-contract.md).
- Prior findings and preparation coverage: [October 20 research](../../archive/02-research/npc-cognition/README.md), [research design map](npc-cognition-research-needs-design.md).
- Existing execution and semantic owners: [AI providers](../ai-providers.md), [cognition](cognition-redesign.md), [character experience](character-experience.md), [agency](agent-agency.md), [context](cognition-context.md), [public speech](npc-speech-streaming.md), [production deployment](production-deployment.md).

## Scope and sequence

- [x] Select the Macrofold/OpenLegend ownership boundary, compatible immutable deployment/activation binding, explicit NPC purposes, exact capability preflight, request/allocation accounting split and no-replay lifecycle.
- [x] Specify reproducible low-refusal/character experiments, evidence provenance, classification, coverage, full cost, stage gates and implementation tasks. This closes the selected design preparation only.
- [ ] Implement MX01–MX05 through the existing owners.
- [ ] Qualify MX06–MX08 using actual evidence before recording any candidate adoption or external-player readiness.

Implement in dependency order below. Use relevant existing checks and representative ad-hoc scenarios under repository verification policy; this assignment does not authorize new automated test infrastructure or any paid execution. Model execution and GPU activation remain separate explicit, finite, funded operations.

| Stage | Work | Dependencies and exit |
| --- | --- | --- |
| Shared target and contract | MX01 | Macrofold canonical contract and consumer types agree; ordinary/native routes remain distinct. |
| Purpose and admission | MX02–MX03 | MX01; same frozen target reaches selection, financial admission, request and receipt. |
| Evaluation and records | MX04–MX05 | MX01–MX03; dry preparation and complete truthful reporting work without model calls. |
| Transport and gameplay qualification | MX06–MX07 | Installed Macrofold capability and prior stages; actual narrow live evidence is labeled separately. |
| Review and reconciliation | MX08 | Applicable preceding evidence; no implicit promotion or broad gate closure. |

## MX01 — Implement the shared custom-target branch

**Owner:** `packages/ai/src/types.ts`, `macrofold-decision.ts`, narrow target/request preparation module; server direct-inference decoder. **Design:** technical §3. **Dependency:** matching Macrofold deployment API and canonical contract.

- [ ] Add the exact three-UUID binding alternative and provenance/accounting receipt fields; reject mixed provider/deployment shapes. Preserve native decision model restrictions and the existing provider branch.
- [ ] Reuse the current executor/Run owner for both standalone generation and server direct inference. Omit `input.model`, OpenRouter routing and OpenRouter reasoning parameters in the custom branch.
- [ ] Decode native completed ChatCompletion values with the existing local schema validator. Match pinned source/runtime/qualification/activation identity before publishing a usable answer; retain cost and accepted Run even on an invalid value.
- [ ] Map canonical pre-admission rejection and accepted/uncertain outcomes precisely. Unknown network/HTTP errors do not imply no dispatch; no automatic paid retry or fallback.

**Exit:** canonical request/receipt/error examples are accepted or rejected as specified by both repositories, ordinary provider requests retain their shape, and native scoring cannot accept an arbitrary chat deployment.

## MX02 — Resolve trusted purposes and profiles before funding

**Owner:** `apps/server/src/config.ts`, `ai-director.ts`, `macrofold-model.ts`; existing benchmark options/manifest owner. **Design:** technical §§4–5. **Dependency:** MX01.

- [ ] Parse/freeze the strict startup profile, authorized Macrofold workspace, exact target, optional output reduction and profile digest. Reject invalid supplied configuration; absence preserves baseline configuration.
- [ ] Add explicit `npc_response_fast`/`npc_response_complex` at the existing NPC producer. Disable the retained private-preview opt-in on the custom completed-output branch. Do not infer purpose from `fast`/`complex` or model equality; action interpretation, player expression and consolidation remain on their own routes.
- [ ] Perform bounded descriptor preflight with the same trusted workspace in GET queries and inference body; capture immutable revision evidence and activation accepted funding terms. Require verified manifest identity, actual schema dialect/keywords and complete context capability for gameplay; record all provenance/trust limits. No read triggers provisioning, activation or renewal.
- [ ] Carry one effective record through allowance, meter/reservation, serialization and receipt. Preserve `AI_JEV_ONLY`, fixture/no-call controls, zero-budget behavior and configured escalation separation.

**Exit:** a single-purpose override changes only its named NPC producer; invalid/missing capability fails visibly, and no-dispatch modes make no external model calls even when GPU capacity is prepaid.

## MX03 — Preserve financial, Run and world lifecycle owners

**Owner:** `macrofold.ts`, `cognition-budget.ts`, `attempt-budget.ts`, existing operational journal/accounting/save owners. **Design:** technical §§6–7. **Dependencies:** MX01–MX02.

- [ ] Preserve positive configured per-call ceilings and actor/task admission. Settle explicit verified zero request charge separately from activation liabilities; never fake a zero token rate or double-count one allocation across calls. Reject RunPod BYOK when a study requires a guaranteed external hard cap; otherwise preserve the accepted planning commitment and residual shutdown liability.
- [ ] Preserve write-before-dispatch, accepted Run persistence, exact-Run observation/cancellation, original deadlines and uncertainty holds. Classify host expiry/capacity independently from output quality.
- [ ] Recheck actor life, observer permission, source/timeline freshness and native operation prerequisites before publication. Switching a profile or restoring a world cannot relabel/republish earlier requests.
- [ ] Keep profile/credentials/remote authority outside gameplay saves. Reconfiguration is controlled restart; no hot alias, host wake or automatic lifecycle command from gameplay.

**Exit:** failed/lost/late requests retain correct cost uncertainty and never apply stale effects, while admitted work does not gain a replacement model or fresh budget session.

## MX04 — Extend the existing benchmark with explicit custom arms

**Owner:** `scripts/decision-benchmark` arm resolution, execution, journal, recovery and grading; existing private artifact permissions. **Design:** technical §§8–9. **Dependencies:** MX01–MX03.

- [ ] Add the proposed `--model-experiment` input and strict manifest-supplied custom generation targets and explicit `json_schema`/offline `text` mode without changing the historical seven-arm set. Keep gameplay schema required; expose offline raw text only through the standalone same-executor `generateText` method. Use the existing structured generation question compiler when applicable; generated scores remain estimates, not native probabilities.
- [ ] Freeze targets, source/runtime evidence, corpus families/splits, original inputs/references, co-models/escalation, exact finite work list, context/schema identities, request bounds, authorized total cost and stop conditions before dispatch.
- [ ] Reuse single-writer journaling, retained first attempts, source/request/financial fingerprints and exact-Run recovery. Dry preparation submits no inference and does no hosting mutation; passive remote reads require explicit online preflight. Start the first finite screen with the specified inspected pair, retaining all selected/unattempted work.
- [ ] Record every selected combination, including unattempted/unknown/refused/invalid outcomes and non-overlapping financial obligations. No best-of retry, hidden output repair or post-hoc expected-answer edit.

**Exit:** a dry prepared custom cohort is reproducible; raw-text outputs cannot enter gameplay or structured-action scores, and existing historical reports remain unchanged.

## MX05 — Report the whole experiment honestly

**Owner:** existing benchmark report/diagnostics and cost aggregation; no new billing ledger. **Design:** technical §§7–10. **Dependencies:** MX01–MX04.

- [ ] Report selected/attempted/answered/completed coverage, quality conditional on answers, common-answered diagnostics, first useful admitted output and complete end-to-end latency.
- [ ] Separate assistant refusal, quiet sanitization, character disagreement, uncertainty, provider block, service withholding, malformed output, engine rejection and actual committed effects; preserve ambiguous reviewer classifications.
- [ ] Report request charges, allocation compute/startup/idle/storage estimates and final charges, co-model costs, outstanding obligations and authorization once each, with unknown values explicit.
- [ ] Preserve exact artifact/runtime/template/tokenizer/settings/qualification evidence and unverifiable fields. Display only the private context the existing diagnostic owner permits.

**Exit:** output quality never hides coverage or severe errors; zero request charging never implies free hosting; raw private artifacts are outside Git.

## MX06 — Qualify contract behavior without paid calls, then the exact runtime

**Owner:** the current provider/benchmark verification paths and Macrofold capability evidence. **Design:** technical §11. **Dependencies:** MX01–MX05; actual installed shared API for live phase.

- [ ] Demonstrate role isolation, strict schema rejection, receipt mismatch, unknown submit/accepted Run recovery, cancellation, zero-budget/no-call mode, current deadline policy, allocation expiry/capacity and once-only settlement with existing checks or focused ad-hoc inputs.
- [ ] After separate execution authorization, run the smallest finite exact-artifact schema, provenance, latency, usage, cancellation and cost probes needed to qualify that runtime. A probe is not a model-quality study.
- [ ] Keep imported endpoint operator-declared provenance visibly distinct from managed verified manifests; qualify authenticated reachability rather than treating cloud localhost as a player machine.

**Exit:** observed contract and financial evidence identifies its exact runtime/revision; simulated cases do not close live capability or hosting-cost evidence.

## MX07 — Run the frozen controlled comparison and native episodes

**Owner:** benchmark review and current cognition/character/agency acceptance owners. **Design:** technical §9. **Dependency:** MX06 and an explicitly authorized finite study.

- [ ] Run the selected original-character family cases with held-out families, fixed alternatives and complete failure coverage; preserve the first answer and all co-model contributions.
- [ ] Have two blinded reviewers independently classify consequential expression/agency outcomes; retain disagreement and adjudication. Model judges cannot replace native truth or severe-error review.
- [ ] Run the selected disposable-world ordinary response, actual failed/interrupted action and later-return episodes through existing admission, save/restore and observer constraints. Preserve existing CTR ordinary-baseline requirements.
- [ ] Reconcile actual allocation and other model cost. Keep financial completion open for uncertain host termination/invoices.

**Exit:** a dated report distinguishes private transport, offline behavioral, actual native episode, cost and human experience evidence; it does not infer one from another.

## MX08 — Reconcile docs and make any adoption decision explicitly

**Owner:** this tracker, provider/current-contract docs and existing CE/CR/AG, PD, NST, PF/PS owners. **Dependency:** applicable prior exits.

- [ ] Update current-route documentation only for installed behavior, maintain shared contract and limit links, and record the exact achieved evidence and remaining gaps.
- [ ] Decide whether the candidate merits another finite study, a specific role adoption or no adoption using the frozen improvement/latency/cost criteria. An uncensored label or passing schema probe is not an adoption rule.
- [ ] Keep external-player content/publication/privacy gates, long-term character/player enjoyment and town-scale capacity with their existing owners. Mark only evidence actually established; do not close unrelated needs-design rows.

**Exit:** any selected default has an explicit reviewable decision and qualified scope; otherwise the experiment remains optional and baseline configuration unchanged.
