# Level-1 decisions: cheap routine choices with explicit escalation

| Status      | Current progress                                                                                                                      | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Selection, escalation and diagnostics are implemented; named live outcomes, request-body fixtures and reasoning-cap gaps remain open. | 2026-10-04   |

Approved by Mike in chat on 2026-09-28; the implementation is integrated in the current source. The original branch, sequence and fixture checks below are historical delivery records, not a branch-merge prerequisite. Live evidence covers only the outcomes named in the linked report; the remaining CR01/CR02/CR12 criteria stay open.

Characters should settle routine situations with one cheap Jev judgment and ordinary native admission, and use a generative model only when the supplied choices cannot express what is needed. Before the September 28 implementation, finding no qualifying action ended with “Jev deferred the action choice; no automatic escalation.” The delivered resolver now distinguishes valid low ratings from defective answers and permits bounded generative escalation only for the former. This plan records [CR02](../maintainers/cognition-redesign.md#cr02--semantic-levels-and-immediate-speech) level-1 selection and its open verification items, the CR02 inspector rows, and [CR01](../maintainers/cognition-redesign.md#cr01--separate-model-text-from-execution-metadata) per-level limits, cost accounting and payload-inspection fixtures. The canonical selection contract is [agent agency runtime §2.4](../../archive/07-technical-architecture/agent-agency-runtime.md#24-level-1-selection-without-generative-escalation); acceptance fixtures are the [CR12 level-1 cases](../maintainers/cognition-redesign.md#cr12--acceptance-and-tokenlatency-evidence).

Estimated impact: roughly 900–1,300 runtime/UI logic lines plus fixture tests and documentation. A durable plan is warranted because the change crosses routing, spending admission, provider-outcome reporting and the god-mode inspector, and seven parallel branches edit neighbouring files.

## Scope and owners

In order of priority:

1. **CR02 level-1 contract** — `apps/server/src/jev-questions.ts`, new `apps/server/src/level1-selection.ts`, localized edits in `apps/server/src/ai-director.ts` around the level-1 route. Bindings are prepared before the question that selects them; selection is one combined Jev request or a bounded dependent second request; one selected binding goes through the existing `commitActorResponse` admission; outcomes are explicit act, continue, escalate or defer; escalation uses the existing level-2–4 generation path and spending reservation.
2. **CR02 verification** — fixtures proving a greeting causes no harness run and no default high-effort reasoning; an exceptional event can request reflection while the decision and simulation continue; every job starts with fresh model history and current instructions; actual model, effort and parameters are forwarded; refusal, unavailable, invalid and uncertain outcomes stay distinct in job results and traces.
3. **CR02 inspector rows** — the existing Intelligence calls panel (`apps/client/src/ui/diagnostics.tsx`) plus its server projection (`apps/server/src/cognition-inspection.ts`): offered routes, native gates, Jev input and judgment, routing reason, level-1 selection result, escalated input/response, and every outcome kind (pending, skipped, deferred, coalesced, canceled, stale, failed, uncertain).
4. **CR01 per-level limits and accounting** — `apps/server/src/cognition-budget.ts`: one table of independent input, visible-output, reasoning, byte, tool-round and monetary limits per level, a per-decision ledger that counts instructions, schemas, Jev attention/routing/selection and generation, and deterministic payload-inspection fixtures for a greeting, a resource task, a promise and a hazard.

Consumed, not restructured: `decision-context.ts`, `response-context.ts`, `cognition-contracts.ts`, `packages/domain/src/response.ts` (actions agent); `actor-work.ts`, `interests.ts` (perception agent). Not edited: invention-owned files, `packages/ai/src/macrofold.ts`, and `apps/server/src/macrofold.ts` (heavily edited on `codex/integrate-invention`). Out of scope: AG01 multi-operation translation, AG06/AG07, decision/response context restructuring and reaction intake.

## Decisions

- **Combined request, not a mutually exclusive Choice.** The owner's 2026-09-27 decision ([CG05](../limits/cognition.md#cg05)) replaced the single Choice over actions because similar actions diluted its winning probability. “Combined Choice” in CR02/CR12 is therefore delivered as one Jev request carrying the route and reflection Choice questions together with the independent per-action Noul ratings. These questions do not depend on one another's answers, so batching them satisfies “without batching dependent questions.” Non-speech semantic triggers always consider actions, so their bindings are prepared first and use the combined request; the route question then sees the actions it is choosing between. Speech triggers keep the dependent second request because the `possibleAction` gate decides whether actions are prepared at all. A combined request that would exceed Jev's size limits falls back to the dependent path before any dispatch.
- **Outcomes.** The highest rating at or above the existing 0.7 selection threshold acts; if it is the offered continue binding, the actor deliberately continues (an empty response through admission, reported as `continued`, not as a generic empty reply). Below 0.7 the choice is beyond Jev: ratings from 0.5 to 0.7 are _uncertain_, below 0.5 _no suitable action_. Either escalates when generation is enabled and its allowance can be reserved; otherwise the decision defers with that reason. Missing or invalid ratings defer without escalation, because paying a larger model to repair a defective judgment is an automatic paid repair; answers for unoffered handles are recorded and never executed. A failed selection request (refused, unavailable, invalid, uncertain) fails the job with that outcome and never escalates.
- **Escalation target.** The highest-scored offered generative route in the same route answer (level 2, 3 or 4), defaulting to level 2. Current decoding preserves the supplied finite scores without imposing a normalization sum; these are selection inputs, not calibrated correctness probabilities ([provider contract](../ai-providers.md#provider-behavior-and-limits)). At most one escalation per level-1 resolution (an urgent refresh decides again within the per-decision limits); reflection is never scheduled because a selection succeeded (only the independent reflection question can request it).
- **Generation context after ratings.** When generation follows a combined request or an escalation, it is offered the actions Jev rated at or above the 0.5 relevance line, reusing the existing ratings instead of buying a second relevance judgment. Its schema, admission and grounding are unchanged.
- **Distinct terminal outcomes.** Job results and trace roots carry the provider outcome (`refused`, `unavailable`, `invalid`, `uncertain`, `failed`, `cancelled`) or `budget-exhausted`, `stale`, and the level-1 outcome with its reason. Protocol job statuses are unchanged.
- **Zero external requests.** Fixtures inject a fake `AiClient` or a fake transport into the real adapters and install a network guard; their in-process fixture ceiling follows the existing director harness. Exhausted-budget cases and any server process started for inspection use `AI_BUDGET_USD=0` or fixture accounting with no credentials. Live Jev/provider verification needs a separately approved cap and stays a remaining gate.

## Implementation sequence

1. Refresh and verify the base (`origin/main`, `be68b1e0`); create `codex/level1-decisions`. Write this plan.
2. Level-1 selection module and director integration: combined/dependent requests, outcome resolution, escalation through generation with budget-refusal deferral, distinct provider outcomes on `StopJob`, level-1 selection and routing-reason diagnostics. Fixtures for the CR12 level-1 cases. Commit.
3. CR02 verification fixtures: greeting, reflection request during continuing simulation, fresh history and forwarding through the real direct adapters with a fake transport, distinct outcomes. Commit.
4. Inspector rows in the existing panel and projection; browser inspection against a fixture server. Commit.
5. CR01 per-level limits table, decision ledger and enforcement points; payload-inspection fixtures for greeting, resource task, promise and hazard, including the inner-world quota versus greeting-target conflict. Commit.
6. Reconcile the runtime contract, memory architecture, AI providers, architecture, limits inventories, trackers, verification report, implementation status and changelog; review the full diff and fix findings. Commit.

## Verification and completion

The original implementation selected the checks below; later work follows the current [verification policy](../../.agents/rules/verification.md) rather than inferring authorization to add more tests from this historical sequence. Checks: pinned Prettier on changed files, `pnpm typecheck`, `pnpm build` for the panel, focused new and existing server/AI tests against disposable PostgreSQL with zero external requests, and browser inspection of the panel against a fixture server. No live Jev, LLM or embedding requests; additional Jev cost is $0.

Done when fixture dispatch traces cover every level, speech and every failure outcome with zero external requests; a native scenario shows act, continue and escalate through real admission; the inspector shows them; CR01/CR02 (and satisfied CR12 level-1) checkboxes are updated honestly; and live provider verification is recorded as a separate remaining gate.

## Progress

- [x] Plan and base
- [x] Level-1 contract and CR12 level-1 fixtures
- [x] CR02 verification fixtures
- [x] Inspector rows
- [x] CR01 limits, ledger and payload fixtures
- [x] Documentation reconciliation and review

## Delivery and evidence

Development started from `origin/main` at `be68b1e0d75baac3c2c9f38948824aa4a98ed0d9` on `https://github.com/Macrofold/OpenLegend.git`, verified with `git ls-remote`; the task named that base explicitly, so no rebase was needed. Fixture, native and browser evidence is in [level-1 decisions verification](../verification/level1-decisions.md); every run made zero external requests and additional Jev cost is $0.

Beyond the planned scope, two defects found during verification were fixed: the existing director test harness reached the real embeddings endpoint with a fixture key, and invalid generated output and context refusals were reported as generic failures. The per-level visible-output limit was aligned with the advertised 40,000-byte response envelope after payload inspection showed a smaller unadvertised limit.

Remaining gates, each tracked in its owner: hard reasoning-token caps and scaffolding removal ([CR01](../maintainers/cognition-redesign.md#cr01--separate-model-text-from-execution-metadata)); inference-body fixtures ([MW05](../maintainers/macrofold-worker-api.md#mw05--outcome-classification-and-request-body-fixtures)); the old invention-merge prerequisite is satisfied, and [NP01](../verification/level1-decisions.md#np01-reliable-ai-outcomes-and-spending--october-2-2026) delivers the bounded Macrofold outcome/accounting repair with its separately stated synthetic evidence, not live deployment qualification; embedding accounting ([CR01](../maintainers/cognition-redesign.md#cr01--separate-model-text-from-execution-metadata)); the greeting-target product decision ([CG09](../limits/cognition.md#cg09)); follow-ups for other owners in [TODO](../maintainers/TODO.md#level-1-decisions-follow-up); and live verification of escalation, continue and deferral (the [September 29 live check](../verification/level1-decisions.md#live-check-september-29) observed only level-1 acts and level-2 replies, for $0.007279666).
