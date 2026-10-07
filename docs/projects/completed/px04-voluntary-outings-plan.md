# PX04 — Voluntary outings implementation plan

| Status    | Current progress                                                                                                             | Last updated |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | Outings and the requested correctness/scalability review are delivered, with broader population qualification still tracked. | 2026-10-06   |

## Scope and dependencies

Implement [PX04's player journey](../parallel-batch-04-expeditions-and-exchange-feature-spec.md#px04--take-a-voluntary-outing-together) and [consent contract](../parallel-batch-04-expeditions-and-exchange-tech-design.md#px04--consenting-travel-companions). The [PX04 tracker](../../maintainers/parallel-batch-04-expeditions-and-exchange.md#px04--voluntary-shared-outings) owns acceptance. This plan does not replace that contract or close broader agency, psychological needs, promises or institutions.

Starting worktree: `/Users/mzw/.codex/worktrees/b8e4/OpenLegend`, branch `codex/px04-voluntary-outings`, commit `b1357b379abfcd32c205d81a6f85153a4aabf9da`. PG02, PG03 and scoped PG04 are integrated. Refreshed `origin/main` in `https://github.com/Macrofold/OpenLegend.git` resolves to `0a3ab79b7a698a7f1941dc23722f89220d1ba425`, already an ancestor; no history rewrite was needed. PX03 is not a dependency.

Estimated change: 1,200–1,800 logic lines excluding tests, plus maintained documentation. Risk is material across consent, private projections, action ownership and restart. Refine this estimate as source tracing identifies the smallest complete implementation.

## Implementation

1. Add exact saved pair/destination consent beside existing activity requests. World-authored support owns labels, scope and expiry using the existing social-offer lifetime. Shared read-only prerequisites feed both discovery and execution. Pending offers retain the proposer's selected-work identity; acceptance checks current participation and work before starting either actor. Terminal records leave the live invitation set; ordinary events and personal action evidence retain outcomes.
2. Start each person's own finite navigation activity through existing composition/agency admission. Link consent to the exact admitted plans, never to arbitrary later work. Movement completion records who arrived; leaving or invalidation stops only still-owned trip work. Destination changes require a new invitation. Separation produces permitted evidence and ordinary reconsideration, never remote tracking or an omniscient follow controller. Preserve navigation's existing deadlines and blocked outcomes.
3. Integrate installed request discovery, current ordinary NPC choices and personal activity context. Show exact terms and optional purpose, accept/decline/withdraw controls, truthful own progress and a reachable Leave outing action. Nearby-person invitation chooses a currently permitted destination; no future place list or permanent party HUD.
4. Cover action replacement/interruption, threat, visibility loss, participation departure and current-format restore. Keep acceptance and terminal effects idempotent through ordinary receipts. No legacy reader, migration, automatic paid retry, new planner or per-tick model request.
5. Reconcile current agency/action/social contracts, PX04, AG05/AG06/AG07/AG12, relevant CE and DG06/ND10 subsets, plus action/base-world/cognition limits. Keep undelivered broader work open. Review the complete resulting diff, repair in-scope findings and commit all task-owned changes.

## Verification and completion

Use focused existing checks after inspecting their fixtures, relevant static checks and a small disposable-world scenario through real callers for lifecycle gaps. Native execution uses `AI_BUDGET_USD=0`. Inspect and interact with player controls in the browser. Use bounded live choices only under the task's shared $10 ceiling, with conservative reservation and exact cost reporting; fixtures cannot prove voluntary NPC preference.

Required outcomes: useful-destination and ordinary social-visit invitations; freely selected acceptance, context-grounded refusal and departure; independently completed navigation and separately chosen arrival activity; stale work/destination, blocked route, separation/hidden position, threat, tab departure, save/reload and duplicate acceptance/terminal replay. Record native, fixture, browser and live evidence separately, including gaps. No task is complete while agreed implementation or required verification remains unfinished.

## Decisions

The pair and fixed-destination scope is accepted from PX-L03. Existing activity and motion owners retain all physical authority. Consent supplies no item, combat, promise, friendship or private-location permission. No additional owner decision is currently required; a newly discovered consequential ambiguity must be resolved before dependent implementation.

## Delivery and review

Approximately 1,200 added/changed production lines deliver the agreed family through existing owners. [Verification](../../verification/voluntary-outings.md) records native/static/PostgreSQL/browser/live evidence and complete costs. Review fixed reciprocal duplicate invitations, observer-safe companion wording, explicit work choices, retained activity drafts, package initialization order and same-response cancellation before saving a newly selected replacement plan. No broader psychological, institutional or unattended-community claim is made.

## Requested post-delivery review

Review the complete change from `b1357b379` through `fd3e35b28`, tracing public requests, native consent, ordinary decisions, navigation, persistence and private projections. The refreshed `origin/main` at `0a3ab79b7a698a7f1941dc23722f89220d1ba425` is already an ancestor; this review keeps the same branch and worktree.

Corrections affect roughly 200 logic lines. Reuse the draft owner's changed-entity proof and derived outing index to restrict command reconciliation to affected participants/destinations, retaining conservative full reconciliation when coverage is unknown. Index accepted membership to avoid repeated incoming-offer scans. Reuse the existing personal event as the plan's evidence instead of duplicating it, verify stated purpose through direct requests, and account for suspended work in acceptance choices. Enforce the existing person-consent scope using personal-memory capability, and keep travel identifiers bounded independently of authored actor ID length. Keep required trip context once in the decision facts, rather than repeating it in current and paused work descriptions. Native simulation still reconciles live pairs at its existing boundaries; no new scheduler, planner, population limit or cached permission is introduced.

Verify through actual command/response/participation callers, existing lifecycle and PostgreSQL restore scenarios, and matched independent-pair/shared-recipient workloads. Check current-visibility behavior, changed destinations, accepted membership invalidation and exact personal evidence. Reuse prior browser/live evidence for unchanged interactions; qualify any changed controls through the browser. Inspect the full resulting diff, run relevant formatting/type/build checks, reconcile current contracts and focused remaining-work owners, and commit all review fixes. Completion requires demonstrated fixes without weakening consent or expanding the agreed scope.

Review completion: all 20 supplied native scenarios, required server recall, PostgreSQL restore/replay, player acceptance/Leave controls, focused existing menu checks, type checking, build and formatting passed. Matched before/after measurements remove unrelated command scans and shared-recipient quadratic work; they do not certify full-server capacity or eliminate tail variance. Current agency/action/social contracts and the relevant limits are reconciled. The PX04 tracker retains one consolidated population/crowded-recipient qualification item, while broader AG12/CE and psychological/institutional work remain open.
