# Massive-scale research → canonical work coverage

[Scaling index](README.md) · [Sequence](sequence-and-gates.md) · [SC remediation](../maintainers/scaling.md) · [SF feature/release readiness](../maintainers/scaling-feature-readiness.md) · [Deferred LT backlog](../maintainers/scaling-long-term/README.md)

This is a traceability/navigation map, **not another status tracker**. Every listed reference points to task bodies or an explicit conditional evaluation. Parent tasks keep existing completion state; research-derived additions are marked **Massive-scale research** in their owners. A paper is evidence to evaluate, not an instruction to deploy its architecture. Historical independent-world-first advice is superseded by the accepted shared-world regional priority.

## How to follow a recommendation

For current-code findings, start with [SCA01–SCA52](current-code-audit.md); each has an owner. The [SC routing table](../maintainers/scaling.md#existing-work-remains-in-its-existing-owner) preserves already-owned PF/EPR/SW/CR/D work. SC01–SC16 now contain independently staged child items. SC04's actual multi-authority implementation is retained as LT-R03–LT-R07, not mixed into its immediate namespace task.

G0 means the current foundation; G1 means before the relevant world/history/library growth claim; G2 means before public shared play. G3/G4 are deferred multi-authority or specialized/behavior-changing options. P3/P4/P5 features carry their own readiness gates and need not wait for P6.

## Complete dossier inventory

All paths in the first column are under `archive/02-research/massive-scale/`.

| Research document | Concrete work owner / decomposition | When |
|---|---|---|
| [README](../../archive/02-research/massive-scale/README.md) | This map and sequence; no independent implementation | G0 navigation |
| [repository-audit](../../archive/02-research/massive-scale/repository-audit.md) | Newer SCA audit; SC01–SC16 plus existing-owner routing | G0–G2; LT-R for distributed boundaries |
| [repository-hot-paths](../../archive/02-research/massive-scale/repository-hot-paths.md) | EPR02/03/10, PF03/08/09, SC15, SF03 | G0/G1 after attribution |
| [now/foundations](../../archive/02-research/massive-scale/now/foundations.md) | SC01.1/01.4, SC04.1–04.2, SC09, SC11, SC13, D0/D1/D2, SF01–SF04 | G0 contracts; G1 implementation |
| [now/contracts](../../archive/02-research/massive-scale/now/contracts.md) | D0 inventory, SC01/04/09/11/13, SF04 | G0; runtime checks at consuming slice |
| [soon/production-world](../../archive/02-research/massive-scale/soon/production-world.md) | SC01–SC03/SC07, D1/D2, SF12 | G1/G2/P2 |
| [soon/data-migration](../../archive/02-research/massive-scale/soon/data-migration.md) | D1/D2 vertical slices; SC05/06/11/14/16; SF10/SF11 | G1/G2, P3 live evolution |
| [soon/operational-readiness](../../archive/02-research/massive-scale/soon/operational-readiness.md) | SF07–SF12, SC01/02/03/10/16; D5 | G2 before public persistence |
| [target-architecture](../../archive/02-research/massive-scale/target-architecture.md) | D0–D6; SC04/SC07; LT-R and LT-O | Early seams, conditional distribution |
| [capacity-model](../../archive/02-research/massive-scale/capacity-model.md) | SF01–SF03/SF08, SC07.4, LT-M01 | G0/G1 measurement; revise every expansion |
| [benchmark-plan](../../archive/02-research/massive-scale/benchmark-plan.md) | SF01–SF06/SF11/SF12, PF00/PF11/EPR09; LT-R09/LT-O08 | Each changed path, then its release gate |
| [domains/simulation-time](../../archive/02-research/massive-scale/domains/simulation-time.md) | SC09.2/SC15; PF03/PF09; SF03; LT-R07/LT-S01/02/06 | G0/G1 exact semantics; later experiments |
| [domains/physics-navigation](../../archive/02-research/massive-scale/domains/physics-navigation.md) | SW05/06/08, AG05, SC13.3/SC14.3, SF03; LT-S03/04 | Current incomplete-result/cold-query work first |
| [domains/perception-interest](../../archive/02-research/massive-scale/domains/perception-interest.md) | EPR02/03/05/08/09/10, SC02/08/15, SF15/SF17; LT-R05/LT-M04 | G0/G2; cross-region only at G3 |
| [domains/browser-networking](../../archive/02-research/massive-scale/domains/browser-networking.md) | SC01/02/03, PF05/PF10, SF02/SF06/SF10; realtime owner | Before public clients; transport remains replaceable |
| [domains/memory-retrieval](../../archive/02-research/massive-scale/domains/memory-retrieval.md) | D2/CR; SC06/08/11; SF05; LT-M01–LT-M08 | DB-first eligibility now; specialized indexes later |
| [domains/agent-compute](../../archive/02-research/massive-scale/domains/agent-compute.md) | SC03/06/07/08/10/11, EPR05, SF05/SF08; LT-O05/LT-S07 | G1/G2 scheduler; conditional hosting/surrogates |
| [domains/persistence-consistency](../../archive/02-research/massive-scale/domains/persistence-consistency.md) | D1/D2, SC04/05/06/09/10/11/16; SF04; LT-R03/06/10/LT-O07 | Exact local invariants before physical distribution |
| [domains/economy-social](../../archive/02-research/massive-scale/domains/economy-social.md) | SF14/SF15; D1/D2/NC/AG; LT-R06/LT-S08 | P2/P4; cross-region exports only when selected |
| [domains/extensibility-security](../../archive/02-research/massive-scale/domains/extensibility-security.md) | SC01/03/12/13/14; SF09/SF13/SF16; existing EWF08/10, INV-3/5/G2 and D20/D36 | Early authority/cost; G2/marketplace conditional |
| [domains/environment-systems](../../archive/02-research/massive-scale/domains/environment-systems.md) | SC13/14/15; SF13; SW/EWF/INV; LT-S05/06 | P3 coarse supported model, P7 refinements |
| [domains/media-assets](../../archive/02-research/massive-scale/domains/media-assets.md) | SF06/SF16–SF18; runtime-art/SW/NC/EPR/D5 | Asset feature/P5; not automatically after P6 |
| [domains/operations-cost](../../archive/02-research/massive-scale/domains/operations-cost.md) | SC03/10, SF07–SF12; PF06/D5; LT-O01–LT-O08 | Initial safe hosting first; cells/geography later |
| [later/world-fleet](../../archive/02-research/massive-scale/later/world-fleet.md) | LT-R03/04, LT-O01–LT-O04/LT-O08 | Deferred; independent worlds not shared-world proof |
| [later/hot-world](../../archive/02-research/massive-scale/later/hot-world.md) | LT-R01–LT-R10, LT-S04/LT-S08 | G3; D61 and actual interaction graph |
| [later/planetary-memory](../../archive/02-research/massive-scale/later/planetary-memory.md) | LT-M01–LT-M08; SC11 remains prerequisite | G4 measured corpus/maintenance trigger |
| [case-studies/mmo-lessons](../../archive/02-research/massive-scale/case-studies/mmo-lessons.md) | SF01/SF03, LT-R01, LT-S08, LT-O01 | Evidence for decisions, not inherited game limits |
| [case-studies/research-panel](../../archive/02-research/massive-scale/case-studies/research-panel.md) | SF05, LT-M03/LT-S07/LT-O05 and relevant owner experiments | Evaluate the actual workload and quality |
| [architectural-options](../../archive/02-research/massive-scale/architectural-options.md) | SC07; LT-R01; LT-M03/04; SC13; LT-S01/06; LT-O03; LT-S08; SF04 | Each option retains its explicit trigger |
| [risk-register](../../archive/02-research/massive-scale/risk-register.md) | SCA/SC map; SF07–SF12; LT-R09/LT-O08 | Mitigation and release evidence, no duplicate queue |
| [decision-questions](../../archive/02-research/massive-scale/decision-questions.md) | Existing D03/D09/D14/D20/D22/D36/D48/D58–D62; SF07; LT-S08 | Before its consuming feature; accepted choices stay closed |
| [research-gaps](../../archive/02-research/massive-scale/research-gaps.md) | SF01–SF06 and conditional LT comparisons; existing research backlog | Evidence-gap evaluations, not invented certainty |
| [sources](../../archive/02-research/massive-scale/sources.md) | Source registry referenced by all chapters; owner refreshes affected evidence before vendor/API-specific implementation | No task per citation or requirement to adopt every paper |

## Specific invariants that cross several chapters

**State and history:** D1/D2's normalized-record implementation cannot be closed by PF08/SC05 snapshot improvements. Preserve one writable owner, source incarnation, exact quantities and non-rewindable accounting. SC16 handles coherent capture, not merely higher size limits.

**Spatial output:** EPR owns legitimate acquisition, PF/SW own computational work. SC15 indexes applicability before activation; EPR02 uses receiver-specific range and event-time geometry. True dense output has a cost; LT-S08 owns any proposed experience change.

**Private memory:** D2/SC11 filter eligibility before ranking and at publication; SF05 evaluates behavior and mandatory evidence. LT-M archives cannot restore forgotten knowledge. Creator power never grants human-private access.

**Invention:** SC12 handles library/search growth; SC13 handles active/transitive work; SC14 handles dependencies/upgrades; SF13 proves a concrete construction/environment path. EWF08/INV own the contract, not a parallel compiler or inventory. G2 and richer solvers remain conditional.

**Scheduling and economics:** SC03/06/07/08/10 separate queue limits, durable attempts, fairness, index lag and money. SF08 measures full cost. A million durable identities do not require a million permanently running model contexts.

**Deployment:** SF07–SF12 qualify initial shared access. LT-R09/LT-O08 qualify the later distributed system. One cannot stand in for the other. Static audits and task creation are not execution evidence.

## Tracking check

This pass expands existing SC work, retains already-owned tasks, and adds separate SF integration/evidence children plus a deferred LT set. No existing delivered feature is marked unfinished merely because it now has a larger scale gate. No new runtime checkbox is marked complete. Further findings belong in the current owner with a specific research/audit reference, not a second copy of this map.
