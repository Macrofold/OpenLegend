# Parallel batch 04 — Expeditions and exchange — assignment tracker

**Status: in progress, October 7, 2026.** PX01 is delivered on the integrated PG05/embodied-feedback baseline; PX03 is delivered and reviewed. PX02, PX04 and PX05 remain open with their separate checks below. The original planning baseline was c4e18d91. Runtime tasks start from integrated prerequisites in the technical design, not merely from the planning commit.

[Feature/acceptance](../projects/parallel-batch-04-expeditions-and-exchange-feature-spec.md) · [Technical definitions](../projects/parallel-batch-04-expeditions-and-exchange-tech-design.md) · [Five prompts](../projects/parallel-batch-04-expeditions-and-exchange-prompts.md) · [Numbers and prior batches](../projects/parallel-batches.md)

## PX01 — A readable wilderness threat

**Completed October 6.** Supplied revision `0a3ab79b7a698a7f1941dc23722f89220d1ba425` includes PG05 and the overlapping injury/targeting/escape/remains work. PX01 reused that delivery, corrected a reachable escape route refused at a ground seam, and qualified the integrated encounter through native commands, player projection and PostgreSQL reconstruction. [Integration evidence](../verification/first-threat-encounter.md#px01-integrated-encounter--october-6-2026) separates the new checks from reused PG05 browser/lifecycle evidence and wider unqualified behavior. No encounter, recovery or protection rule was replaced.

The [requested review](../verification/first-threat-encounter.md#px01-navigation-review--october-6-2026) is complete: direct ramp entry is retained, the longer support walk avoids a repeated destination, and matched bounded measurements plus actual walking/escape checks pass. Broader geometry/capacity qualification remains with SW05/SW17 and the existing parent trackers.

- [x] Prerequisites supplied: PG05's paired encounter design with relevant owner decisions settled, plus integrated/qualified overlapping embodied-feedback behavior.
- [x] Deliver warning, avoidance, engagement and aftermath under [PX01 scope](../projects/parallel-batch-04-expeditions-and-exchange-feature-spec.md#px01--a-readable-wilderness-threat) and [technical ownership](../projects/parallel-batch-04-expeditions-and-exchange-tech-design.md#px01--encounter-implementation-contract), preserving protection and actor-permitted pursuit. Warning means observable signs and actual preparation, not a guaranteed safe interval.
- [x] Complete integrated encounter acceptance, including changed geometry, miss, blocked reach/return, loss/disconnection/recovery and persistence; reconcile the exact delivered portions of PG05/BW14/MP04/PS05/DG07/ND11 without closing broader human-conflict or ghost scope.

Parents: [PG05](parallel-batch-03-personal-game.md#pg05--first-threat-encounter-design), [base world](base-world.md), [multiplayer](multiplayer.md), [product scalability](product-scalability.md), [DG07/ND11](needs-design.md#dg07--human-participation-and-recoverable-conflict). Embodied-feedback's actual injury/targeting/escape/remains work is a prerequisite consumer, not a duplicate task.

## PX02 — Reciprocal barter

- [ ] Extend current handover/custody to exact, revisioned, consensual two-sided exchange, preserving gifts under [PX02 scope](../projects/parallel-batch-04-expeditions-and-exchange-feature-spec.md#px02--trade-something-useful) and [contract](../projects/parallel-batch-04-expeditions-and-exchange-tech-design.md#px02--reciprocal-offer-contract).
- [ ] Deliver readable player and actor choices without exposing private inventory; complete atomicity, changed-terms, refusal, replay and restart acceptance.
- [ ] Reconcile BW20, immediate-barter DG06/ND09 and the relevant INV-20/PO portions; retain standing reservations, credit, currency, promise management and institutions as separate open scope.

Parents: [base world](base-world.md), [persistent objects](persistent-objects.md), [inventions](inventions-and-world-evolution.md), [DG06](needs-design.md#dg06--reciprocal-exchange-and-small-cooperation). Consumes integrated PG03/PG04 action surfaces; does not depend on another PX task.

## PX03 — Useful discoveries and known places

[CF05](parallel-batch-06-rivals-and-contested-ground.md#cf05--a-contested-ruin-and-a-victory-that-lasts) proposes an occupied-site discovery/return consumer of this place owner. Its merge dependency remains explicit; the new batch does not supply a duplicate memory store or change PX03 completion evidence.

- [x] Add grounded place-arrival and inventory-inspection evidence to existing encounter/story/experience ownership under [PX03 scope](../projects/parallel-batch-04-expeditions-and-exchange-feature-spec.md#px03--discover-useful-places-and-objects) and [contract](../projects/parallel-batch-04-expeditions-and-exchange-tech-design.md#px03--encounter-evidence-and-known-places).
- [x] Deliver the scoped Known places view with explicit focus/inspect/move, honest last-known information and current-format persistence; complete repeated-exposure, two-observer, privacy and stale-destination acceptance.
- [x] Reconcile NC09–NC12's exposure subset, DG01/ND18 and relevant SW/memory work. Preserve broader narration, story and world-map acceptance.

**PX03 completed and reviewed:** private discovery, useful introductions and Known places are delivered. The October 6 review fixes late forgetting/correction, moved/removed marker integrity, source-family collisions, unstable continuation and SQL amplification, with a canceled-inspection browser check. Native lifecycle, scoped query/stress, keyboard and compact/enlarged browser checks pass; the linked report retains planner and broader qualification limits. [Evidence](../verification/useful-discoveries.md) records current results and limits.

Parents: [narration](narration-and-conversations.md), [spatial world](spatial-world.md), [DG01/ND18](needs-design.md#dg01--actions-and-first-encounters). PG03 excludes this new encounter scope; its action presentation remains a consumed prerequisite.

## PX04 — Voluntary shared outings

[CF04](parallel-batch-06-rivals-and-contested-ground.md#cf04--a-companion-who-can-help-in-a-fight) is the proposed later combat-help consumer. It extends supplied request/consent semantics while keeping a trip separate from consent to fight and preserving independent withdrawal. PX04 is still a prerequisite, not repeated or marked complete by that allocation.

- [ ] Supply integrated PG02's ordinary decision and continuation behavior; define exact trip consent and independent current action ownership under [PX04 scope](../projects/parallel-batch-04-expeditions-and-exchange-feature-spec.md#px04--take-a-voluntary-outing-together) and [contract](../projects/parallel-batch-04-expeditions-and-exchange-tech-design.md#px04--consenting-travel-companions).
- [ ] Deliver invitation, voluntary acceptance/refusal, travel, arrival and leaving; complete changed-work, interruption, privacy, blocked-route and save/replay acceptance.
- [ ] Reconcile the concrete AG05/AG06/AG07/AG12, CE and DG06/ND10 subsets; leave group institutions, promise management, follow-everywhere behavior and unattended communities open.

Parents: [agency](agent-agency.md), [character experience](character-experience.md), [DG06](needs-design.md#dg06--reciprocal-exchange-and-small-cooperation). Uses destinations already available today; no dependency on PX03, barter or shelter construction.

## PX05 — Editable shelter technical design

- [ ] Reconcile the existing shelter product specification and produce its technical counterpart under [PX05 scope](../projects/parallel-batch-04-expeditions-and-exchange-feature-spec.md#px05--design-an-editable-place-worth-returning-to) and the [design questions](../projects/parallel-batch-04-expeditions-and-exchange-tech-design.md#px05--shelter-technical-design-assignment).
- [ ] Resolve or explicitly gate structural, custody, support, permission and lifecycle choices; produce an actionable build/use/edit/reclaim delivery breakdown with contrasting arrangements and relevant failure traces.
- [ ] Reconcile DG13/ND07/shelter-only ND08, INV-6.4, SW/PO/BW and shelter limits. Mark only this design task complete when adequate; runtime construction remains unimplemented.

**October 5 product input:** DG13 extends the existing feature specification in place with one flat cloak canopy and an adjacent two-bay awning, actual finite parts, reversible binding, ordinary use and explicit permission/reclaim behavior. [The base-world owner](../worlds/base/editable-shelters.md) selects proposed dimensions/work/moisture values. A sloped lean-to follows qualified shape/clearance rather than preceding the open canopy. This supplies product decisions only; all PX05 checkboxes remain open for its technical counterpart, delivery breakdown and complete reconciliation.

Parents: [shelter proposal](../projects/editable-shelters-feature-spec.md), [INV-6](inventions-and-world-evolution.md#inv-6--composable-materials-assemblies-and-passive-world-processes), [DG13](needs-design.md#dg13--editable-shelter-and-useful-places). Independent design assignment; no construction or paid experiment is implied.

## Completion and reconciliation

Task-specific acceptance belongs to the feature/design pair above; this tracker owns checkbox state and parent disposition. [Proposed constraints](../limits/parallel-batch-04-expeditions-and-exchange.md) remain proposals until adopted into subsystem owners. The whole batch completes only after all five agreed assignments, their integration and actual required evidence are finished; drafting this allocation does not satisfy runtime scope. The owner integrates assignments without requiring task-to-task communication. Wider historical qualification is neither silently closed nor restarted by numbering this batch.
