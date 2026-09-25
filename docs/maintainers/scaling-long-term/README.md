# Long-term scaling backlog — deferred, not next-up work

[Current scaling work](../scaling.md) · [Sequencing and promotion](../../scaling/sequence-and-gates.md) · [Research coverage](../../scaling/research-coverage.md)

**Every unchecked item here is deferred until its stated trigger is met and implementation is authorized.** These are conditional G3/G4 work items, not requirements for P1, P2 or the first public single-region release. Early identity, scoped data, permission, dependency and recovery seams remain in SC/D/PF/EPR/INV; do not defer those because their distributed implementation is here.

This is the canonical task location for newly decomposed long-term research follow-through. D6 and the relevant feature trackers retain parent release acceptance; they link here instead of copying these bodies. A promoted task keeps its ID and body here, with its promotion record updated and a link added to current scheduling. Completing an evaluation may recommend not adopting the technique; implementation/deployment tasks remain open unless separately satisfied.

## Work families

| Family | Detailed tasks | Primary parent and trigger |
|---|---|---|
| LT-R01–LT-R10 | [Regional authority and world distribution](regions.md) | D6/P6; measured shared-world saturation, approved D61 policy and ready D1/D2 records |
| LT-M01–LT-M08 | [Large-scale memory and storage](memory-storage.md) | D2/D6/CR; actual corpus, skew, maintenance or recovery requirements exceed qualified storage |
| LT-S01–LT-S08 | [Advanced simulation and fidelity](simulation.md) | PF/SW/EWF/INV; a measured kernel bottleneck or explicitly approved new mechanic |
| LT-O01–LT-O08 | [Fleet, geography and inference operations](operations.md) | D5/D6; enough operational demand to justify additional failure domains or specialized hosting |

Voice, generated assets, ordinary economy/privacy, and compatible in-world evolution are **feature-gated**, not automatically remote-future work. They are tracked with their P3/P4/P5 or first-public-release consumers in [feature-scale readiness](../scaling-feature-readiness.md). Cross-region economies and irreversible exports need LT-R06 in addition to those local invariants.

## Promotion record required for each activated item

Record the requesting product feature or measured bottleneck, reference workload and baseline, accountable implementer, exact accepted semantic choices, dependency readiness, budget/environment authorization, planned evidence and stop rule. No named implementer is assigned by this planning pass.

For a deployment, also record rollback/recovery, privacy and cost evidence. A testbed with two regions is not approval to run globally. A paper's throughput number is not the workload baseline. See the [research panel](../../../archive/02-research/massive-scale/case-studies/research-panel.md) and [benchmark plan](../../../archive/02-research/massive-scale/benchmark-plan.md).

## Preserved boundaries

Shared-world regional priority is accepted; exact crowd treatment is not. No implicit time dilation, instancing, reduced witness fidelity, cohort substitution, storage vendor, global economy, arbitrary script runtime or self-hosted model commitment follows from these checkboxes. Keep D03/D14 and current human-private restrictions intact. Independent worlds remain supported but do not replace the shared-world gate.

Read current code and the canonical spec before promotion; audit snapshots describe their pinned revision. All external source claims remain in the research dossier; these files turn that research into explicit engineering/evaluation work.
