# Action records and learned activities — project

| Status      | Current progress                                                                                                                      | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | The initial native and typed-learning implementation is delivered; the generative action-description acceptance remains open in AE03. | 2026-10-03   |

**Status: initial delivery and September 28 qualification are retained; [AE03](../maintainers/action-experience.md#ae03--compact-english-and-remaining-work-views) is reopened for the generative action-description caller.** Mike requested a durable design for nested action descriptions, observed effects, connected experience, reflection-time learning and shared method reuse. This package supersedes the informal proposals in the embodied-survival discussion; the [current behavior owner](../action-experience.md) describes the delivered contracts, and the [evidence report](../verification/action-experience.md) records their qualification.

## Maintained records

- Behavior and scenarios: [feature specification](action-experience-feature-spec.md).
- Structure, algorithms and ownership: [technical design](action-experience-tech-design.md).
- Implementation, dependencies and exit evidence: [AE01–AE10](../maintainers/action-experience.md).
- Current operating envelopes and unsupported scope: [AEL01–AEL08](../limits/action-experience.md).
- Existing authorities: [action capabilities](../action-capabilities.md), [agency](../agent-agency.md), [memory](../memory-architecture.md) and [knowledge](../knowledge.md).

## Original problem and direction

At the design baseline, an actor selected “hunt with knife,” but terminal feedback described equip/strike commands and their outcomes. It lost the activity's purpose and native approach steps. A flat list cannot adequately describe nested work, several targets, partial outcomes or relationships between produced resources. At that baseline, successful hunt → harvest → cook → eat choices did not create a reusable learned method. The implementation now records and learns these connections.

Choosing well also requires more than a clear action name or complete weapon statistics. The context must connect the actor's needs, goals and commitments to known targets, requirements, costs, possible consequences and uncertainty. For a sequence, it must retain later requirements and resource conflicts even when the first action is available. The [choice-information contract](action-experience-tech-design.md#cognitive-information-for-action-choice) composes existing actor context and family facts without choosing the character's goal or prescribing an action.

Use one structured action representation with typed role bindings, nested steps and explicit lifecycle/outcome/effects; render compact, clear English from permitted facts. Optional brackets show nested actions. JSON is a last resort for otherwise unrenderable permitted details; internal IDs, reference tables and bookkeeping stay out of the model's action context. Retain a finite execution tree and separately recorded connections between occurrences. Build bounded learning candidates from those records, including coherent actor-selected purposes that need no material output dependency. Learn during eligible downtime, retrieve methods only when relevant, and reuse world-scoped structural definitions without sharing private experience or granting unearned knowledge.

The owner first requested this design and subsequently authorized its complete implementation. The mechanisms below are the accepted initial contract; settled owner requirements are not optional wording experiments. Typed contracts and finite measured envelopes now exist; the gates below remain the delivery audit. No generated program, universal hunt controller, mandatory goal or new physical execution owner is proposed.

## Baseline and scope assessment

Historical September 28 implementation baseline, not the current review checkout: local `main` at `adb52c73f797690edaea41bf9723e13ea433fa3a`, containing freshly fetched `origin/main` at `c5455cf8fc9e4d4fe03034a7f069d6d6581bb8f2` from `https://github.com/Macrofold/OpenLegend.git`. The remote default is `main`; local main is two commits ahead. No branch switch, rebase or history rewrite is needed. Unrelated art-direction changes remain outside this task.

The original design-only pass changed zero runtime logic lines. At implementation entry the estimate was revised to 3,000–5,000 changed non-test logic lines across domain, server, storage, protocol and presentation owners. The delivered scope remains in that cross-layer range; formatting expansion is not extra behavioral scope. Material risks are omniscient context, duplicated effects, invented causality, save/restore divergence, incorrect method matching, exponential candidate growth and paid reflection backlog. A renderer-only fix cannot deliver this scope.

## Original documentation work plan and completion

Read current contracts and code; challenge the design using independent ownership and failure-case reviews; write the paired specification plus technical design; create the focused tracker and limit inventory; link existing AC/AG/CR owners and the embodied-survival proposal; record consequential proposals and residual tuning; validate plain-language examples, fallback boundaries, links, formatting and the full affected diff. The September 28 refinement adds single-action and sequence decision relevance, bounded fact preparation and acceptance contrasts under AXE13; existing context/capability owners remain authoritative. That design-only completion meant a coherent implementable contract, not runtime delivery. Subsequent runtime evidence is recorded separately.

The implementation-readiness review covers this entire package and its linked AC/AG/CR/survival/decision summaries. Reconcile every illustrative offer and remaining-work example with the same information contract; distinguish fragments from complete action descriptions. Check control names, outcome/partial-output semantics, graph evidence and matching, task dependencies and all limit-enablement gates. Preserve prior runtime evidence and unrelated edits. Completion requires the resulting diff, examples, references and tracker mappings to agree; documentation checks do not establish runtime correctness.

## Delivery sequence

1. **Truthful action records and informed choices:** preserve selected meaning and committed outcomes; implement nested/scoped projections and relevant single-action context through existing owners. Define the shared decision-information contract before learned-method preparation.
2. **Connected evidence:** explicit multi-output/resource/evidence links and bounded incremental candidate construction.
3. **Learning and reuse:** idle typed assessment, shared structural deduplication, actor-owned acquisition and contextual retrieval with whole-sequence requirements/consequences.
4. **Chosen method execution:** existing AC/AG composition, current remaining-work context, guarded continuation and interruptible repetition.
5. **Qualification:** independent reproduction, privacy, interrupted recovery, different worlds and measured large traces.

The [tracker](../maintainers/action-experience.md) owns detailed work, dependencies and acceptance. Slices are not permission to stop midway through later authorized scope. The first slice must remain useful without prematurely installing learning or full activity execution.

## Implementation entry and enablement gates

| Stage                                      | Required decision or evidence                                                                                                                                                         | Owner                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Before coding each affected slice          | Finalize its typed contracts, current-format storage shape, AC descriptor adapters, role/output bindings and required supported operators; re-estimate scope against the current code | AE01–AE04/AE06/AE09, existing AC/AG/SL owners |
| Before enabling new preparation or storage | Select finite measured request/traversal/queue/retention/admission envelopes and verify overflow/recovery; existing small plan limits do not bound the new stores                     | AEL01–AEL08 and their named AE owners         |
| Before enabling learned-method use         | Verify actor-scoped evidence, atomic retain, duplicate suppression, invalidation/revocation, current privacy overlays after restore and native continuation through actual outputs    | AE06–AE10                                     |
| Before claiming behavioral completion      | Run the integrated AXE cases through downstream callers and budgeted model trials; fixtures establish mechanics, not model comprehension or reliable behavior                         | AE10                                          |

The initial contract uses exact compatible structural matching, evidence-backed tentative retention and eligible idle learning. Approximate semantic matching, automatic numerical confidence promotion/decay, and learning during an ongoing native wait are later policy extensions, not hidden prerequisites or enabled defaults. [D67](../../archive/05-project/open-decisions.md#d67--action-records-and-learned-activities) tracks those future choices. [AEL](../limits/action-experience.md) now records selected budgets; the verification report is the source for measured runtime results.

## Decisions to carry forward

Mike's September 28 correction replaces the initial JSON-plus-summary proposal with compact English and optional nested brackets. The same plain pattern handles leaves and compositions; names, targets, tools and actual outcomes appear directly, with no visible IDs or internal tags. Structured records remain internal, and JSON is a narrow last resort rather than a routine second representation. The owner clarified that brevity must preserve task-critical details, including which of several knives was selected and its relevant known qualities; templates track coverage and JSON carries critical otherwise-unrendered facts. Containment, dependency, purpose and chronological order have different meanings. “Finished” never alone means a purpose succeeded. Time controls when learning runs, not which actions are related. A recognized smaller method remains available for larger composition; matching never consumes its source trace. Sharing a method definition never shares its discoverer's private memories or automatically adds it to another actor's choices.

The [technical design](action-experience-tech-design.md#decisions-and-tradeoffs) records remaining choices. Mike authorized the complete implementation in chat, including running isolated test servers. No second approval is required for the agreed scope; existing shared spending, privacy and save policies still apply.

## Design verification

Independent read-only reviews checked examples, ownership and cross-document consistency. Corrections distinguish complete action descriptions from template fragments, approach distance from attack reach, and historical observations from current facts. They also reconcile partial outputs, canonical control names, candidate boundary rules, contributing injury evidence, overlapping matches, atomic learning publication, revocation and task/limit dependencies. The initial draft's JSON examples were checked before the owner superseded that presentation. The September 28 review checks compact-English examples, metadata exclusion, narrow fallback rules, local links, formatting and the affected diff. Those initial documentation checks did not establish runtime behavior. The later authorized implementation is qualified in the linked evidence report.

## Authorized implementation plan

Implement AE01–AE10 end to end, preserving the existing agency/kernel, observation/context, repository, AI admission and client owners. At plan entry, source inspection found the existing plan was flat and receipts were single-output; storage already provides separate indexed record collections and the maintenance owner already provides durable paid admission. Estimate 3,000–5,000 changed logic lines, to be reassessed as integration becomes concrete; this is a cross-layer, high-risk change. Unrelated art edits and live servers/saves stay untouched.

1. Add validated action occurrence, view, dependency, method and private-acquisition contracts with finite admission; map supported families to their existing native commands. Preserve one physical mutation owner.
2. Capture selected purpose, actual native stages, committed effects and multiple output quantities; integrate same-version validation, indexed storage, checkpoint/restore and scoped inspection.
3. Extend the existing agency frontier for finite nested sequence/branch/repeat/wait execution, actual-output bindings, cancellation and remaining-work projection.
4. Prepare complete permitted decision information and deterministic English, using narrow safe fallback only for uncovered critical facts; preserve exact server binding outside model-visible descriptions.
5. Implement bounded connected candidate discovery, exact normalization, atomic method retention/private acquisition and invalidation. Retrieve only personally known relevant methods.
6. Add typed idle learning within existing maintenance/admission/accounting, including strict non-generative operation and stale/cancel/uncertain-spend handling.
7. Exercise AXE01–AXE13 through real downstream callers, disposable PostgreSQL and an unused server port. Run selected static/existing checks, bounded trace/candidate stress, save/restore/privacy cases and capped live behavior trials. Retain actual prompts, decisions, outcomes and exact costs.
8. Reconcile canonical behavior docs, limits, tasks and verification evidence, fix all in-scope review findings and finish only when the agreed integration and required qualification pass.

Spending remains one $10 task ceiling including prior provider-reported estimates of $0.12594624 and a separate $0.25 uncertain hold. This implementation uses an initial additional local ceiling of $5 across all live trials, with conservative per-call reservations and no automatic paid retries. No new paid calls had been made at plan entry. Final calls, costs and remaining uncertainty are recorded in the evidence report.

## Delivered outcome

All AE01–AE10 initial slices are implemented under the existing owners. [Current behavior](../action-experience.md) describes the final contracts, [AEL](../limits/action-experience.md) records concrete bounds, and [verification](../verification/action-experience.md) maps every AXE acceptance scenario to its actual evidence and limits. The final valid-terrain automatic trial completed hunting, harvesting, cooking and eating using 86 Jev calls, zero generation and $0.023492490 reported cost. Total implementation trials cost $0.077365764; cumulative task reported cost is $0.203312004 plus the separate $0.25 uncertain hold. This demonstrates the complete controlled scenario, not guaranteed behavior or optimal calls per meal.

The working branch remained `main`; the initial remote/ref was `origin/main` from `https://github.com/Macrofold/OpenLegend.git` at `c5455cf8`. No branch/history mutation or real-save reset was needed. Generality is bounded by the supported native families and private evidence, not by a canned survival sequence.
