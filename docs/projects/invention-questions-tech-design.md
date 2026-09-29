# Invention questions: technical design

**Status: approved implementation target; implementation in progress.** Implements the design scope of the [feature specification](invention-questions-feature-spec.md). The recommendation below preserves the current contract that human waiting is not active model execution.

## 1. Baseline and decision

Research baseline: OpenLegend `eeabd8cb51d9070715bf02c2348c8ef55769f50c`, Macrofold `47db45e75d8b9ad23f1507a7939a20f626763665` ([PR 12](https://github.com/Macrofold/Macrofold/pull/12)). Refreshed OpenLegend main is `be68b1e0d75baac3c2c9f38948824aa4a98ed0d9`; its relevant runtime/question contracts do not change this proposal. The approved implementation section records subsequent integration and qualification. Recheck deployed Macrofold behavior before implementation/enablement; a PR is not a deployment guarantee.

Before this implementation, [the Macrofold adapter](../../apps/server/src/macrofold.ts) rejected `waiting_for_input`; [the runner](../../apps/server/src/world-agent-runner.ts) expected a terminal reply; finishing or recovering a turn invalidates its execution handle. OpenCode questions were explicitly denied. Enabling one permission alone cannot implement the feature.

**V1: capture → stop → answer → fresh admitted continuation.** On a qualified native question event, persist its exact meaning and fence the originating authoring context, then cancel only that Run through the existing adapter. Preserve the question independently of execution status. Reconcile committed native operations and costs before continuing. Human waiting holds no application execution slot or live native Run once stopping is confirmed. Stopping/uncertain work remains bounded and counted until reconciliation; do not free capacity by pretending it has terminated.

An explicit answer/Continue operation can start one fresh Macrofold Session/Run under the same OpenLegend conversation and funding session. It uses current scoped context and retained records, not the old native transcript with an unanswered tool call. This extends existing continuation rather than introducing a second workflow service.

## 2. Macrofold transport: observed, not invented

The inspected OpenCode adapter emits durable `input.requested` Run events containing `input_request_id`, a plain-text summary and `details.questions`. Each question contains `question`, `header`, `options: [{label, description}]`, optional `multiple` and optional `custom`. There are no stable per-question or per-option IDs; native order and label strings matter. Normalize omitted flags to the qualified OpenCode defaults (`multiple: false`, `custom: true`); WW25 must verify these against the deployed adapter/SDK before enabling them.

Use the existing authenticated paginated `GET /v1/runs/{id}/events?after=…` reader with a durable numeric cursor. A durable SSE endpoint also exists, but adding streaming is unnecessary for v1. There is no question webhook; terminal notifications are insufficient. `GET Run` does not return the pending question payload. A waiting status may race event visibility: reconcile bounded event pages before declaring a missing payload, without dispatching model work.

Macrofold's current `waiting_for_input` keeps the original deadline and Worker occupancy. Its model gateway and tool broker still admit the waiting Run. It offers no demonstrated checkpoint suspension or guarantee of zero work/spend while waiting. V1 therefore does not leave this state open for a human reply.

Macrofold also exposes `POST /v1/runs/{id}/input` with an `Idempotency-Key` and `{input_request_id, answer: {answers: string[][]}}` for OpenCode. It accepts only the matching unanswered current wait. Its 202 acknowledges storage, not resumed execution. The inspected public schema requires a UUID, while the adapter forwards an opaque native ID; the API's generic answer metadata does not validate option membership or cardinality. **V1 never calls this endpoint**, so fixing that mismatch is not a prerequisite for capture-and-stop. Same-run resume would require those fixes/qualification, genuine bounded suspension and adapter-specific answer mapping; Codex/Claude mappings differ. Do not impose an OpenLegend-only hidden parameter on other Macrofold callers.

Source references at the recorded Macrofold commit: `packages/runtime/src/opencode.ts` (question mapping), `packages/core/src/runs.ts` (input acceptance), `packages/core/src/events.ts` (durable events), `packages/runtime/src/supervisor.ts` (deadline/cancel), and public `packages/contracts/api.d.ts` (`RunInput`). WW25 rechecks exact source paths and deployed contracts as part of qualification.

## 3. Semantic owners and contracts

| Responsibility                                                     | Existing owner and change                                                                                                                                      |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Receive remote events, stop/reconcile Run                          | `apps/server/src/macrofold.ts`; add a typed question callback/result and bounded event ingestion, retaining original Run/receipt identity.                     |
| Scope, immutable question/answer acceptance, continuation identity | `WorldAuthoringService`; same authority checks, serialized session operations and native outcome reconciliation.                                               |
| Durable operational records                                        | `world-agent-store.ts` PostgreSQL session/turn records; question data is non-rewindable authoring history, not world state or a new database.                  |
| Execution and recovery                                             | `world-agent-runner.ts`; separate pending human intent from active execution, use existing admission/cancellation/recovery.                                    |
| Public views and requests                                          | `packages/protocol/src/world-agent.ts` and existing same-origin session routes; return scoped question/answer summaries with explicit states.                  |
| Conversation rendering and interaction                             | Existing World Agent client/components and shared form controls; presentation and intentions only.                                                             |
| Context/requirements                                               | Existing world-authoring context, submission and requirement owners; extend authenticated human-source references, reuse exact draft/dependency/check readers. |

Proposed discriminated records (names are design notation, not shipped wire fields):

- **Question bundle:** local ID, source session/turn/Run and event sequence, opaque native request ID, source digest, ordered normalized questions/options, scope/timeline and selected revision/dependency pins, creation sequence, disposition. Keep provider identities private. Each local question/option receives a server ID bound to its bundle and position; never accept browser-supplied labels as authority.
- **Question:** exact prompt, optional heading, single/multiple selection, custom-answer permission and ordered option IDs with exact labels/descriptions. Plain text only. Empty options are valid only for a qualified custom-only question. Reject duplicate/ambiguous option labels, unsupported required semantics and oversize input; do not silently drop fields that change how to answer.
- **Answer:** stable operation ID, bundle ID/digest, ordered per-question answers discriminated as selected option IDs or custom text, authenticated answering principal, source sequence, immutable accepted content. Validate all membership/cardinality/byte limits before acceptance. Custom text and option selections are mutually exclusive per question in v1.
- **Continuation:** one immutable operation identity linked to the answer and original task chain, separate admission/Run outcome. A saved answer does not imply that continuation was requested or admitted.

Question disposition (`open`, `answered`, `abandoned`, `invalidated`) is separate from original execution (`stopping`, `terminal`, `uncertain`) and continuation (`not requested`, `admitting/running`, `retained outcome`, `uncertain`). This avoids a combinatorial status enum and lets an answer be retained while accounting remains blocked. A normal human pause is not reported as a failed invention; the original remote Run still retains its truthful cancelled/terminal status.

## 4. Capture, stop and recover

1. Persist the Run identity through current admission before accepting its events. Validate event Run/turn ownership, sequence and size. Preserve the complete native question meaning; final prose is not a question protocol.
2. Under the existing short session/authority operation, atomically save the normalized bundle/source digest, advance its consumed event cursor and revoke that turn's writable context handle. Duplicate identity with identical content replays; changed content conflicts. If persistence fails, use the existing storage-error boundary, stop execution and do not publish an actionable unretained card.
3. Request cancellation outside database/world locks. This intentional question pause has a separate local reason from user cancellation. Reconcile possible already-committed submissions/receipts; late tools fail the revoked handle. Do not erase valid drafts or refund real costs.
4. Project the card immediately with “finishing previous work” while stop/accounting is pending. Keep external exposure and active stopping capacity counted. Release the runner slot when actual termination permits it. Human waiting itself holds no locks or executor slot.
5. Resume event reconciliation from the persisted cursor after delivery loss or restart. A status read may reconcile existing records but never launch generation. An event-retention gap, unknown cancellation, incomplete usage or unretained outcome stays explicit and blocks unsafe continuation. Do not assume remote worker crash recovery from a persistence flag.

World restore, session close, revocation and disclosure reduction invalidate actionability through the current generation/grant owners, not just the browser. Finish callbacks are tied to the exact original Run/turn and cannot replace a newer question. Operational question history/costs survive restore, subject to current read authorization. A restart can recover a retained open question without reviving its old execution handle.

## 5. Accept an answer and continue exactly once

Use proposed `question-answer` and `question-continue` operations on the existing authenticated session route. The first supplies bundle ID/digest, stable operation ID, answers and an explicit `continueIfReady` intention; the second names the saved answer and its stable continuation operation. Route names may follow local conventions, but keep saved intent distinct from paid admission.

The server validates current principal/session scope, bundle actionability, answer shape and exact source digest. Under the same serialized owner, it records the immutable human answer before any external dispatch. Same ID/body returns the retained result; same ID/different body conflicts. Competing answers accept one, including submissions from different tabs. A browser saves request identity before sending and reconciles lost acknowledgement by that identity; it does not mint a new operation.

If `continueIfReady` is requested and admission is immediately safe, persist one continuation intent under the same serialization and use existing durable admission/dispatch. If not ready, retain the answer and explicitly return **saved, continuation not admitted; explicit Continue required** with the blocking reason. The user must press Continue later. Do not queue a latent paid action behind stopping, allowance changes, reconnect or server restart. A crash after admission uses existing original-operation reconciliation, never a replacement Run. Link the answer to at most one accepted continuation identity; a later deliberate correction is a new human operation, not a retry.

Represent each correction as a normal retained human turn, even when it only saves intent; it consumes the existing turn/history capacity. Link it to the superseded answer and invalidate the older answer’s unadmitted continuation atomically. If the old continuation is already admitted/running, serialize through exact-turn cancellation and reconcile its committed results/costs before admitting corrected work. Preserve both answers and any saved revisions; no in-place edit, free allowance or unbounded save-only correction collection.

Before admission, recheck terminal status and attributable cost/reservations for the old Run, original-operation outcomes, current grants/timeline, session allowance, selected revision and facts material to the question. Preserve unrelated background changes through existing dependency scopes; do not invalidate every answer on every simulation tick. If the question's meaning changed, retain the answer as history and require an explicit current-context confirmation/correction rather than silently retargeting it. Saving intent is permitted when funds are unavailable; dispatch is not.

Allocate no new funding session. Preserve configured BYOK/model and medium effort. Build a fresh native Session with a fresh scoped handle and existing profile permissions. Do not reuse an unresolved question-bearing native transcript. An answer only guides design; Apply approval, resource consumption, capability changes and spending increases retain their existing independent checks.

## 6. Human-source integrity and compact context

Current requirements quote human turn text through `{turnId, text}`. Extend the source contract deliberately to reference an immutable authenticated answer, question and selected option/custom text. Validate quotes against that source before model annotations can become retained requirements. Do not insert an assistant's whole question/options into a synthetic human message and call all of it user intent. Selected option meaning includes its exact displayed label and description; unselected suggestions remain model-authored alternatives. Preserve the original question as context for the choice, never as independent human approval.

Build the next prompt programmatically through the existing packet renderer. Include unresolved task intent, selected candidate, current relevant mechanics/checks and the accepted answer once. For example, an illustrative projection is:

```yaml
human_answer:
  source: answer-17
  question: What matters most for this sling?
  selected:
    - label: Accuracy
      meaning: Favor reliable shots.
next_action: Design within the supported mechanics, then save for review.
```

Use the same immutable source reference in requirement records instead of repeating the full options table, raw event JSON, native tool exchange and a paraphrased human transcript. Keep additional answers retrievable through existing scoped readers if the next step needs them; never discard a hard constraint to meet a size target. A selected proposal does not establish that the proposed mechanic exists; native checks still decide support.

Question-enabled prompts say: ask only when the missing human choice affects feasibility, scope or an important tradeoff; inspect mechanics first; prefer one concise question; no repeated answered questions; no questions to approve Apply or buy work; supported defaults remain autonomous. Save any useful supported draft before asking where appropriate; the application may stop the Run on a question. Unsupported capability explanation should finish normally, not force a misleading choice.

The explicit bridge capability selects either native structured questions or the existing ordinary-text path. Do not instruct the model to use both for the same clarification. Keep native questions denied until the whole qualified path is enabled. Broader-kind requests continue to use existing profile/grant transitions; a question cannot widen them.

## 7. UI integration, privacy and boundaries

Extend the current paged turn view with the scoped question and retained answer, rather than fetching Macrofold from the browser. The existing visible-panel status polling discovers cards. Pagination/reopen show retained cards without loading all sessions or dispatching. Inline progress distinguishes waiting, answer saved, continuation running and outcome uncertain; the [feature spec](invention-questions-feature-spec.md#required-interaction) owns interaction wording/accessibility.

Recheck current authorization on every history projection and answer action. Never send raw events, provider IDs/credentials, cross-world questions or hidden actor knowledge to the client. Normalization is not a substitute for the scoped model context: if a question references evidence the audience cannot receive, do not publish that content. Do not create observation/knowledge records merely because an owner read a question. Untrusted labels/free text grant no authority and cannot become HTML, URLs to fetch or commands.

No deterministic domain transition is needed for asking/answering. World-specific tradeoffs remain authored mechanics; the reusable mechanism only captures scoped intent. This works for recipes, supported body-resource bindings and owner policy edits without a universal invention ontology. More complex dependency graphs/check plans remain with their existing owners.

## 8. Bounds, storage and extension seams

[QST01–QST04](../limits/inventions.md#structured-invention-question-proposal) own proposed payload, paging, retained-growth, turn and support limits. Reuse the current PostgreSQL operational record owner, indexed active-session recovery and existing session authorization lifetime. No whole-world scans, model calls on UI polling, new background job platform or global question cache. Event reconciliation is bounded before hydration/normalization, not merely at rendered output.

Storage changes validate the current format and reject incompatible development records explicitly under [the protected development policy](../../AGENTS.md#development-save-policy). There are no old-save readers, conversion fixtures or automatic deletion/reset. Preserve same-version transactional integrity and non-rewindable financial/operation records.

OpenCode-specific question extraction lives in the existing execution adapter. Enable another harness only after its structured transport, defaults and lifecycle pass the same contract tests; no speculative universal provider schema. A genuinely suspended same-run input path can be added behind this semantic owner later without changing the UI's human-answer identity or approval separation. It must first establish resumable authority, typed mapping, answer idempotency and cost/recovery behavior. Question capture uses existing Macrofold events and cancellation. Qualification found a separate necessary explicit native Run option, `limits.stop_on_model_error`, to prevent OpenCode from automatically buying another generation after a provider failure. It defaults off for other callers; OpenLegend opts in. The gateway admits one outstanding model request, fences errors before delivering them, and preserves uncertain cost. This supersedes the earlier expectation that no transport-policy addition would be needed; the question payload/API itself remains unchanged.

## 9. Delivery, verification and unresolved gates

[WW24–WW30](../maintainers/world-agent-writes.md#structured-invention-questions) own staged dependencies and implementation exit criteria. Estimated implementation scope is roughly 500–900 logic lines across adapter, authoring records/service, runner/protocol/context and UI, excluding tests; reassess after contract qualification. Risk is material because privacy, concurrent acceptance and paid continuation cross multiple owners. The design itself changes no runtime logic.

Qualify native event defaults, cancellation after question capture, exact usage/final persistence, committed-tool races and internal retry controls before paid enablement. Existing WW07's uncertain retry/usage gap remains a dependency, not solved by this proposal. Use deterministic injected failures and existing recovery/approval coverage first; then disposable PostgreSQL, browser and actual Macrofold journeys under the shared spending policy and remaining explicit cap. Do not repeatedly run broad qualification or use fixtures as model-quality evidence.

Required proof includes: single/multi/custom questions; existing answer reused without repetition; malformed/oversize/duplicate events; source quote validation; cursor loss/gaps; two-tab conflicts; repeated save-only corrections, superseded Continue and correction during execution; lost answer and dispatch acknowledgement; capture/stop/answer/continuation crash points; cancellation/restore/revocation and disclosure reduction; no admission from status reads; budget exhaustion with retained answer; exact review/Apply and permanent receipt replay after continuation. Measure full requests/generations/cost/time-to-review and verify medium/BYOK forwarding on a relevant supported recipe plus a distinct supported non-recipe journey. Demonstrate unsupported mechanics remain unsupported.

No unresolved product decision blocks documenting this recommendation. The approved end-and-readmit lifecycle and no deferred automatic continuation are implemented on the working branch; deployment remains distinct from local qualification. Cancellation/settlement and native retry support are technical enablement gates; if qualification cannot meet the existing accounting contract, keep structured questions disabled and report the blocker rather than weaken it. Optional same-run suspension is outside the initial implementation.

## 10. Approved implementation plan

The owner authorized full implementation and end-to-end scenarios for this feature and the World Agent context foundation. Start: `52080ecbcf76869901f765610c4a07fbf9965141` on `codex/integrate-invention`; merge refreshed `origin/main` (`be68b1e0d75baac3c2c9f38948824aa4a98ed0d9`) while preserving ancestry and current behavior. No working-branch transition. The existing WW18–WW23 foundation is implemented; audit its actual accepted scope and reuse still-valid evidence rather than rebuild it or pull in unrelated future invention families.

1. Reconcile main's current-format database initialization, action metadata/learned activities and topic verification reports with the existing authoring owners. Preserve current PostgreSQL, approval/receipt and private disclosure contracts. Run relevant static/native checks before relying on the merged baseline.
2. WW25: verify the actual native question event and cancellation/usage path with no-cost injected transport first. Establish native retry control before any paid call. Preserve previous uncertain exposure; the shared $10 ceiling is not reset by this continuation.
3. WW26/WW27: add bounded typed question normalization, atomic operational capture/context fencing, durable human answers, source provenance, exact corrections and single explicit continuation through current store/service/runner owners. Reconcile cancellation, stale grants/dependencies, restore and lost acknowledgements without redispatch.
4. WW28/WW29: implement inline accessible forms, retained state and compact source-backed continuation through existing protocol/UI/context. Keep current owner access, medium/BYOK, native save-for-review, useful hard constraints and approval separation.
5. WW30 and context acceptance: inspect the entire affected diff, fix findings, run focused existing checks and disposable PostgreSQL/native/HTTP/MCP/browser scenarios, and then actual Macrofold question → answer → review with a well-specified no-question control and distinct non-recipe scenario. Exercise race/failure/restart/restore/privacy/accounting paths and measure bounded event/context/history work and browser responsiveness. Retain exact evidence/limitations; static or fixture success does not replace live verification.
6. Reconcile specifications, limits and stable trackers with actual delivered behavior, commit coherent changes, push the integration branch and update PR #24. Recheck main and verify affected changes before final handoff; leave PR merge to the owner.

Completion requires every initial feature requirement and the relevant context-foundation journeys, all required checks and in-scope review fixes. Technical access, financial uncertainty and mandatory conflict-stop rules remain real blockers; do not label incomplete scope as complete. Initial additional-runtime estimate is 500–900 logic lines; reassess if implementation reveals more cross-layer state or lifecycle work. The verification report records actual paid calls and retained exposure.

## Maintained records

- Implementation: [WW24–WW30](../maintainers/world-agent-writes.md#structured-invention-questions), linked from INV-2.3/INV-21 and existing UI/recovery coverage.
- Limits and constraints: [QST01–QST04](../limits/inventions.md#structured-invention-question-proposal).
- Related behavior: [feature specification](invention-questions-feature-spec.md), [runtime](../world-agent-runtime.md), [context design](world-agent-context-tech-design.md), [save/load](../save-and-load.md) and [accounting](../invention-budgets.md).

### Implementation reassessment — September 29, 2026

The cross-layer implementation is approximately 1,300 additional logic lines, including the inline form and bounded restart reconciliation. The larger estimate comes from immutable corrections (including chains of save-only edits), lost-response handling, scope-safe form drafts and recovering the original Run without a new dispatch. Owners and scope remain unchanged; no domain/world mechanism or second execution engine is added. The local PostgreSQL/HTTP/MCP scenario exercises the actual Macrofold transport against a synthetic loopback service before live qualification. Native retry control remains a real provider dependency; no additional paid call is authorized by a fixture pass.

Final lifecycle review also covers bounded event pagination and interrupted inspection after financial settlement. A full four-page window persists progress and resumes later; it is not a missing-question failure. Known usage does not prove that event inspection completed, so shutdown/read failures retain question recovery independently of financial uncertainty. Explicit Stop still prevents a recovered late event from reviving the conversation. The three dedicated recovery scenarios and the 13 core scenarios pass.
