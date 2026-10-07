# PX02 — Reciprocal barter implementation plan

| Status    | Current progress                                                                                                                            | Last updated |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | Immediate barter, scoped recovery and voluntary resident evidence are delivered; current owners and remaining broader scope are reconciled. | 2026-10-06   |

[Feature scope](../parallel-batch-04-expeditions-and-exchange-feature-spec.md#px02--trade-something-useful) · [Technical contract](../parallel-batch-04-expeditions-and-exchange-tech-design.md#px02--reciprocal-offer-contract) · [Acceptance tracker](../../maintainers/parallel-batch-04-expeditions-and-exchange.md#px02--reciprocal-barter)

## Scope and risk

Extend consent-based gifts with one exact lot and quantity on each side. A recipient may accept, decline or propose revised terms; the proposer may withdraw. Each revision has its own consent. Acceptance checks both sides and commits both custody changes together. No supplies are held before acceptance. Existing gifts retain their behavior.

Estimated changed logic: 700–1,300 lines across domain, server, public protocol and inventory/person controls. Material risks are stale consent, disclosure of another person's private possessions, invalid bag contents/work claims, partial movement and duplicate effects after transport failure or reopening. This warrants a durable plan. The current integrated PG03/PG04 owners remain authoritative for descriptions and prerequisite evaluation.

## Development base

Refreshed `https://github.com/Macrofold/OpenLegend.git`, remote `origin`, ref `origin/main`, at `34233ae24365eb8911fe1995c9c232bd57f34616`. The clean detached checkout matched that ref. Created and checked out `codex/px02-reciprocal-barter` in `/Users/mzw/.codex/worktrees/097e/OpenLegend`; the main checkout is unaffected. No history reconciliation was needed.

## Implementation sequence

1. Extend `handover.ts` with exact lot/definition/contents pins, offer revisions, reciprocal terms and counteroffers. Update current command callers and current-format validation together; add no old-format reader. Reuse ordinary object/resource-claim movement. Share pure admission with previews and validate final joint placement before any move.
2. Project participant-only terms and bounded choices from legitimately disclosed exact items. Never query another person's private stock for a candidate list. Keep unavailable requests generic. Ordinary witnessed events and participant receipts record actual outcomes through existing perception/memory.
3. Update the protocol, authenticated server dispatch, ordinary resident choice descriptions and integrated action catalogue. Residents receive permitted terms and existing relevant priorities; choice remains voluntary. Replies remain immediate and cannot become delayed plan steps.
4. Add exact You give / You receive review and Offer/Accept/Decline/Withdraw/counteroffer controls to the existing inventory/person surfaces. Preserve drafts on refusal/staleness/disconnection, refresh authoritative revisions before renewed acceptance, and keep narrow/keyboard controls reachable.
5. Reconcile social/items specifications, subsystem limits, PX02, BW20, persistent objects, DG06/ND09 immediate barter and INV-20's delivered subset. Keep currency, credit, institutions, promises and BW21 reservations open. Record evidence separately from targets.

## Verification and completion

- Inspect suitable existing checks/fixtures first; do not author automated tests by default. Native scenarios use `AI_BUDGET_USD=0`; database scenarios use a disposable PostgreSQL database.
- Exercise the actual command/projection routes for a stack traded for an individual invented tool, existing gifts, voluntary exchange/refusal, changed revision/quantity/contents/work, reach loss, withdrawal, unauthorized acceptance, duplicate delivery and pending/completed save/reload. Assert no half-transfer or private inventory disclosure.
- Interact with and visually inspect the actual client at ordinary and narrow sizes, including exact quantities, counteroffer changes, refusal/draft preservation, keyboard access and transport recovery.
- Run changed-file Prettier, TypeScript and build checks. Run focused existing native/service checks where their fixtures cover the changed owners. Paid resident qualification, if needed, must be explicitly capped within the shared $10 task ceiling, separately reported and never retried automatically.
- Inspect the full affected diff, fix in-scope findings, reconcile documents against actual evidence, commit all task changes and leave no task-owned uncommitted edits. Checkpoint unfinished work at least every 15 minutes.

Completion requires all agreed PX02 behavior and verification above; a native fixture alone does not prove autonomous preference quality. The shared batch documents remain active because the other PX assignments are outside this task.

## Delivered decisions and evidence

The implementation replaces the previous one-way-only pending offer model with current exact reciprocal revisions; no legacy reader was retained. Gifts still accept when their promised quantity remains free and use ordinary merging. Reciprocal exchange preserves each promised lot, checks both final placements together and permits no automatic acceptance or reservation. The compact person selector offers six own lots and six recent explicit disclosures per other person; Inventory can select any exact own item, and an older other-person reference outside an open counteroffer needs fresh disclosure. This bounds candidate preparation while pending lifecycle/storage growth and own-inventory materialization remain tracked in BW20/PF09. The [October 6 review](px02-barter-review-plan.md) replaces repeated lookups with derived indexes, refreshes work-dependent controls and shares player drafts without broadening the economic family. Private browser drafts retain quantities and reviewed revisions through same-session connection/page reload and clear on access loss.

Scope grew to include private draft persistence after actual browser recovery exposed lost drafts; the cross-layer durable plan remained appropriate. The final implementation stays within the agreed atomicity, permitted projections and recovery behavior and introduces no broader negotiation framework. [Actual qualification](../../verification/reciprocal-barter.md) records native, authenticated HTTP, PostgreSQL rollback/reopening, lost acknowledgment, player keyboard/narrow/reload and controlled live resident acceptance/refusal. Static checks and the full affected diff passed. Currency, institutions, credit, commercial promises, standing reservations and general preference/population qualification remain open under their existing owners; no PX02 implementation or developer decision remains pending.
