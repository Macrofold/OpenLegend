# Parallel batch 04 — Expeditions and exchange — assignment tracker

**Status: in progress, October 7, 2026.** PX01 encounter integration, PX02 immediate barter, PX03 discoveries and PX04 voluntary outings are complete with the scoped evidence below; PX05 shelter design is complete. Broader qualification remains open. The original October 3 planning pass completed no runtime work; its local-main baseline was c4e18d91. PX05 source inspection used refreshed `origin/main` at `34233ae24365eb8911fe1995c9c232bd57f34616` in `Macrofold/OpenLegend` (`origin`, `https://github.com/Macrofold/OpenLegend.git`). Runtime tasks start from integrated prerequisites in the technical design, not merely from the planning or design commit.

[Feature/acceptance](../projects/parallel-batch-04-expeditions-and-exchange-feature-spec.md) · [Technical definitions](../projects/parallel-batch-04-expeditions-and-exchange-tech-design.md) · [Five prompts](../projects/parallel-batch-04-expeditions-and-exchange-prompts.md) · [Numbers and prior batches](../projects/parallel-batches.md)

## PX01 — A readable wilderness threat

**Completed October 6.** Supplied revision `0a3ab79b7a698a7f1941dc23722f89220d1ba425` includes PG05 and the overlapping injury/targeting/escape/remains work. PX01 reused that delivery, corrected a reachable escape route refused at a ground seam, and qualified the integrated encounter through native commands, player projection and PostgreSQL reconstruction. [Integration evidence](../verification/first-threat-encounter.md#px01-integrated-encounter--october-6-2026) separates the new checks from reused PG05 browser/lifecycle evidence and wider unqualified behavior. No encounter, recovery or protection rule was replaced.

The [requested review](../verification/first-threat-encounter.md#px01-navigation-review--october-6-2026) is complete: direct ramp entry is retained, the longer support walk avoids a repeated destination, and matched bounded measurements plus actual walking/escape checks pass. Broader geometry/capacity qualification remains with SW05/SW17 and the existing parent trackers.

- [x] Prerequisites supplied: PG05's paired encounter design with relevant owner decisions settled, plus integrated/qualified overlapping embodied-feedback behavior.
- [x] Deliver warning, avoidance, engagement and aftermath under [PX01 scope](../projects/parallel-batch-04-expeditions-and-exchange-feature-spec.md#px01--a-readable-wilderness-threat) and [technical ownership](../projects/parallel-batch-04-expeditions-and-exchange-tech-design.md#px01--encounter-implementation-contract), preserving protection and actor-permitted pursuit. Warning means observable signs and actual preparation, not a guaranteed safe interval.
- [x] Complete integrated encounter acceptance, including changed geometry, miss, blocked reach/return, loss/disconnection/recovery and persistence; reconcile the exact delivered portions of PG05/BW14/MP04/PS05/DG07/ND11 without closing broader human-conflict or ghost scope.

Parents: [PG05](parallel-batch-03-personal-game.md#pg05--first-threat-encounter-design), [base world](base-world.md), [multiplayer](multiplayer.md), [product scalability](product-scalability.md), [DG07/ND11](needs-design.md#dg07--human-participation-and-recoverable-conflict). Embodied-feedback's actual injury/targeting/escape/remains work is a prerequisite consumer, not a duplicate task.

## PX02 — Reciprocal barter

- [x] Extend current handover/custody to exact, revisioned, consensual two-sided exchange, preserving gifts under [PX02 scope](../projects/parallel-batch-04-expeditions-and-exchange-feature-spec.md#px02--trade-something-useful) and [contract](../projects/parallel-batch-04-expeditions-and-exchange-tech-design.md#px02--reciprocal-offer-contract).
- [x] Deliver readable player and actor choices without exposing private inventory; complete atomicity, changed-terms, refusal, replay and restart acceptance.
- [x] Reconcile BW20, immediate-barter DG06/ND09 and the relevant INV-20/PO portions; retain standing reservations, credit, currency, promise management and institutions as separate open scope.

**Delivered October 5:** the [completed implementation plan](../projects/completed/px02-reciprocal-barter-plan.md) records decisions and the development base. One exact lot/quantity per side, replacement revisions and participant-only disclosed terms use the existing handover and ordinary object/claim owners. Current gifts retain sufficient-quantity behavior. [Verification](../verification/reciprocal-barter.md) records 26 native checks, authenticated command/projection, PostgreSQL rollback/reopening and lost-acknowledgment replay, actual narrow/keyboard/draft recovery and controlled voluntary resident acceptance/refusal. The [October 6 review](../verification/reciprocal-barter.md#october-6-review-and-matched-server-measurements) fixes work-dependent controls, open-offer disclosure retention, Inventory quantity maxima and shared draft recovery, and records reduced pending lookup/projection work. General preference/population acceptance, offer-table/lifecycle work and every broader economic/cooperation parent remain open. [BW11](../limits/base-world.md#bw11) owns the adopted PX-L01 first-family bounds.

Parents: [base world](base-world.md), [persistent objects](persistent-objects.md), [inventions](inventions-and-world-evolution.md), [DG06](needs-design.md#dg06--reciprocal-exchange-and-small-cooperation). Consumes integrated PG03/PG04 action surfaces; does not depend on another PX task.

## PX03 — Useful discoveries and known places

[CF05](parallel-batch-06-rivals-and-contested-ground.md#cf05--a-contested-ruin-and-a-victory-that-lasts) proposes an occupied-site discovery/return consumer of this place owner. PX03 is available on local main at `699417835`, so it is a reuse reference rather than an open CF05 prerequisite. The new batch does not supply a duplicate memory store or change PX03 completion evidence.

- [x] Add grounded place-arrival and inventory-inspection evidence to existing encounter/story/experience ownership under [PX03 scope](../projects/parallel-batch-04-expeditions-and-exchange-feature-spec.md#px03--discover-useful-places-and-objects) and [contract](../projects/parallel-batch-04-expeditions-and-exchange-tech-design.md#px03--encounter-evidence-and-known-places).
- [x] Deliver the scoped Known places view with explicit focus/inspect/move, honest last-known information and current-format persistence; complete repeated-exposure, two-observer, privacy and stale-destination acceptance.
- [x] Reconcile NC09–NC12's exposure subset, DG01/ND18 and relevant SW/memory work. Preserve broader narration, story and world-map acceptance.

**PX03 completed and reviewed:** private discovery, useful introductions and Known places are delivered. The October 6 review fixes late forgetting/correction, moved/removed marker integrity, source-family collisions, unstable continuation and SQL amplification, with a canceled-inspection browser check. Native lifecycle, scoped query/stress, keyboard and compact/enlarged browser checks pass; the linked report retains planner and broader qualification limits. [Evidence](../verification/useful-discoveries.md) records current results and limits.

Parents: [narration](narration-and-conversations.md), [spatial world](spatial-world.md), [DG01/ND18](needs-design.md#dg01--actions-and-first-encounters). PG03 excludes this new encounter scope; its action presentation remains a consumed prerequisite.

## PX04 — Voluntary shared outings

[CF04](parallel-batch-06-rivals-and-contested-ground.md#cf04--a-companion-who-can-help-in-a-fight) is the proposed later combat-help consumer. It extends supplied request/consent semantics while keeping a trip separate from consent to fight and preserving independent withdrawal. PX04's delivery below supplies that prerequisite; CF04 remains unimplemented.

- [x] Supply integrated PG02's ordinary decision and continuation behavior; define exact trip consent and independent current action ownership under [PX04 scope](../projects/parallel-batch-04-expeditions-and-exchange-feature-spec.md#px04--take-a-voluntary-outing-together) and [contract](../projects/parallel-batch-04-expeditions-and-exchange-tech-design.md#px04--consenting-travel-companions).
- [x] Deliver invitation, voluntary acceptance/refusal, travel, arrival and leaving; complete changed-work, interruption, privacy, blocked-route and save/replay acceptance.
- [x] Reconcile the concrete AG05/AG06/AG07/AG12, CE and DG06/ND10 subsets; leave group institutions, promise management, follow-everywhere behavior and unattended communities open.

Parents: [agency](agent-agency.md), [character experience](character-experience.md), [DG06](needs-design.md#dg06--reciprocal-exchange-and-small-cooperation). Uses destinations already available today; no dependency on PX03, barter or shelter construction.

**October 6 delivery:** exact consent, current-work revalidation, two own walks, private company/arrival evidence, leaving and current-format restart are implemented. [Evidence](../verification/voluntary-outings.md) records 13 native cases, PostgreSQL reopening, real browser departure/Leave controls and bounded live acceptance, independent arrival eating, voluntary replacement and refusal. This closes PX04 only; broader parents remain incomplete.

**Requested review:** command reconciliation now visits affected participants/destinations, accepted membership is indexed, duplicate personal accounts and repeated decision projections are removed, paused-work acceptance is explicit, valid long actor IDs remain saveable, and native wildlife cannot supply social consent. [Review evidence](../verification/voluntary-outings.md#post-delivery-review--october-6-2026) records the additional native/server/browser checks and matched measurements.

- [ ] Before claiming population capacity, measure complete-server advance, persistence and projection with concurrent accepted walks and incoming invitations concentrated on one person; investigate tail latency and heap growth. Current views enumerate all incoming invitations, so qualify crowded-recipient usability and add scoped paging through the existing choice/view owners if that measured workload requires it. This is broader qualification, not an unimplemented two-person lifecycle. [AEL10](../limits/action-experience.md#ael10--outing-consent-and-own-movement)/[CG16](../limits/cognition.md#cg16--outing-choices-and-reconsideration) retain the current limits; repeatable character preferences and whole-life behavior remain AG12/CE work.

## PX05 — Editable shelter technical design

- [x] Reconcile the existing shelter product specification and produce its technical counterpart under [PX05 scope](../projects/parallel-batch-04-expeditions-and-exchange-feature-spec.md#px05--design-an-editable-place-worth-returning-to) and the [design questions](../projects/parallel-batch-04-expeditions-and-exchange-tech-design.md#px05--shelter-technical-design-assignment).
- [x] Resolve or explicitly gate structural, custody, support, permission and lifecycle choices; produce an actionable build/use/edit/reclaim delivery breakdown with contrasting arrangements and relevant failure traces.
- [x] Reconcile DG13/ND07/shelter-only ND08, INV-6.4, SW/PO/BW and shelter limits. Mark only this design task complete when adequate; PX05 supplied no runtime construction. AV04 subsequently delivers the selected flat profile with [separate evidence](../verification/editable-shelters.md).

**October 5 product input:** DG13 extends the existing feature specification in place with one flat cloak canopy and an adjacent two-bay awning, actual finite parts, reversible binding, ordinary use and explicit permission/reclaim behavior. [The base-world owner](../worlds/base/editable-shelters.md) selects proposed dimensions/work/moisture values. A sloped lean-to follows qualified shape/clearance rather than preceding the open canopy. The [technical counterpart](../projects/editable-shelters-tech-design.md) now completes the eight engineering questions and exact source mapping; [SH01–SH06](editable-shelters.md) owns the sequenced runtime delivery and verification. The flat bay remains first, with the cloak lean-to and shared two-bay arrangement worked through using the same rules. Future enclosure, cooperation, home psychology, heavy failure and general thermal/weather decisions are explicitly gated; none blocks the selected one-builder open shelter. Paper calculations and source/document review establish design completion only; no runtime/provider execution was required or performed.

Parents: [shelter proposal](../projects/editable-shelters-feature-spec.md), [INV-6](inventions-and-world-evolution.md#inv-6--composable-materials-assemblies-and-passive-world-processes), [DG13](needs-design.md#dg13--editable-shelter-and-useful-places). Independent design assignment; no construction or paid experiment is implied.

## Completion and reconciliation

Task-specific acceptance belongs to the feature/design pair above; this tracker owns checkbox state and parent disposition. [Constraint dispositions](../limits/parallel-batch-04-expeditions-and-exchange.md) record PX-L01 adoption into BW11; the other new constraints remain proposals until adopted into subsystem owners. The whole batch completes only after all five agreed assignments, their integration and actual required evidence are finished; drafting this allocation does not satisfy runtime scope. The owner integrates assignments without requiring task-to-task communication. Wider historical qualification is neither silently closed nor restarted by numbering this batch.
