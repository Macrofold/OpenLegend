# Ranked action repertoire

[Library](README.md) · [Priority policy](gameplay-priorities.md) · [Whole-game coverage](ranked-coverage.md) · [Pattern ranking](ranked-patterns.md)

**Current-game selection register · October 3, 2026.** All **384 actions across 32 domains** are reassessed below. This is the authoritative priority assignment for the current survival-adventure; it replaces the earlier Criticality cells in the descriptive [action catalogue](actions.md). IDs, exact intents, qualifications, seed-world applicability and F/U/C/D realization semantics stay in that source. The old cells are historical assessments, not another active roadmap.

Each listed ID receives the score of its section. Rows sort by the policy's whole-game workstream, then stable IDs; grouped IDs share a score and workstream, not an implementation task. Numbers in the Workstream column refer to [the whole-game build order](gameplay-priorities.md#whole-game-build-order). They are not effort estimates. A Core capability can require substantial work; a Detail capability can be small.

**Coverage check:** 384 unique IDs, exactly 12 per source domain; no ID deleted, reassigned or introduced. Core: 35; Complete: 84; Depth: 124; Detail: 83; Specialist: 58. This checks ranking coverage, not runtime support.

## Selection boundaries

The exact intent matters. FLU-01's precise halfway fill is optional granularity; basic water collection, carrying and drinking remain foundational coverage. BLD-03's usable shelter is Core; BLD-07's specially dry bedding setup is Detail. MAK-02's useful weapon crafting is Core; MAK-04/05/06's handle repair, sharpening and patching are Detail with a small bounded scope once their prerequisites exist. Basic following and guarding can support enjoyable companionship; COOP-08's watch agreement and COOP-12's replacement administration do not precede that activity.

Existing inventory, bags, equipment and consumables are the starting point for expedition supplies. No additional “prepare supplies” feature is implied by this ranking. Preservation is Depth, not a reason to delay enemies, rewards or simple water access. The source lacks a plain melee-strike example; that omission does **not** remove basic melee, enemy behavior, damage, loot, player feedback or progression from the Core coverage register.

Low priority never weakens privacy, authority, consent, resource accounting, safe interruption or persistence requirements when a feature is enabled. Alternate-world entries are not forbidden; Specialist means a different world or product commitment needs an explicit contextual rerank. These scores assert no new implementation or playtest evidence.

## 1 Core — 35 actions

| Workstream | Source domain | Action IDs                             |
| ---------- | ------------- | -------------------------------------- |
| 1          | [AUT]         | AUT-11, AUT-12                         |
| 1          | [BOD]         | BOD-01                                 |
| 1          | [COM]         | COM-07                                 |
| 1          | [INV]         | INV-01, INV-02, INV-06, INV-12         |
| 1          | [MND]         | MND-04, MND-11                         |
| 1          | [NAV]         | NAV-01, NAV-02, NAV-04                 |
| 1          | [OBS]         | OBS-01                                 |
| 2          | [ANI]         | ANI-10                                 |
| 3          | [CARE]        | CARE-02                                |
| 3          | [CBT]         | CBT-01, CBT-02, CBT-05, CBT-06, CBT-08 |
| 3          | [FOD]         | FOD-10                                 |
| 3          | [REL]         | REL-05                                 |
| 4          | [OBJ]         | OBJ-02                                 |
| 5          | [KNO]         | KNO-04                                 |
| 6          | [FIR]         | FIR-01, FIR-02                         |
| 6          | [FOD]         | FOD-01, FOD-02, FOD-03                 |
| 6          | [MAK]         | MAK-02                                 |
| 6          | [RES]         | RES-01, RES-05, RES-09                 |
| 7          | [BLD]         | BLD-03                                 |

## 2 Complete — 84 actions

| Workstream | Source domain | Action IDs                                     |
| ---------- | ------------- | ---------------------------------------------- |
| 1          | [BOD]         | BOD-04                                         |
| 1          | [INV]         | INV-03, INV-08, INV-10                         |
| 1          | [NAV]         | NAV-03, NAV-06, NAV-08, NAV-09, NAV-10, NAV-11 |
| 1          | [OBS]         | OBS-02, OBS-04, OBS-06, OBS-08, OBS-12         |
| 3          | [CARE]        | CARE-01, CARE-03, CARE-05                      |
| 3          | [CBT]         | CBT-03, CBT-04, CBT-07, CBT-11, CBT-12         |
| 3          | [ECO]         | ECO-12                                         |
| 4          | [OBJ]         | OBJ-03, OBJ-05, OBJ-06, OBJ-08                 |
| 4          | [REL]         | REL-01, REL-09                                 |
| 4          | [SEC]         | SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-11 |
| 5          | [KNO]         | KNO-01, KNO-03                                 |
| 6          | [FIR]         | FIR-05                                         |
| 6          | [FLU]         | FLU-02, FLU-03, FLU-04                         |
| 6          | [MAK]         | MAK-01, MAK-03, MAK-08, MAK-12                 |
| 6          | [RES]         | RES-03, RES-06, RES-07, RES-08                 |
| 7          | [BLD]         | BLD-01, BLD-02, BLD-06                         |
| 8          | [AGR]         | AGR-01, AGR-07                                 |
| 8          | [ANI]         | ANI-02, ANI-06, ANI-07                         |
| 8          | [ART]         | ART-03, ART-09                                 |
| 8          | [COM]         | COM-01, COM-02, COM-04, COM-05, COM-12         |
| 8          | [COOP]        | COOP-02, COOP-07, COOP-09                      |
| 8          | [ECO]         | ECO-01, ECO-02, ECO-05                         |
| 8          | [VEH]         | VEH-01, VEH-02, VEH-06, VEH-10                 |
| 9          | [AUT]         | AUT-01, AUT-03                                 |
| 9          | [MND]         | MND-01, MND-02, MND-03, MND-06, MND-09, MND-10 |
| 9          | [SOC]         | SOC-05                                         |

## 3 Depth — 124 actions

| Workstream | Source domain | Action IDs                                                             |
| ---------- | ------------- | ---------------------------------------------------------------------- |
| 1          | [BOD]         | BOD-05, BOD-06, BOD-07, BOD-08, BOD-09, BOD-11                         |
| 1          | [INV]         | INV-04, INV-07                                                         |
| 1          | [NAV]         | NAV-05, NAV-07                                                         |
| 1          | [OBS]         | OBS-03, OBS-05, OBS-09, OBS-10                                         |
| 3          | [CARE]        | CARE-08, CARE-10, CARE-11                                              |
| 3          | [CBT]         | CBT-09, CBT-10                                                         |
| 4          | [OBJ]         | OBJ-04, OBJ-07, OBJ-09, OBJ-12                                         |
| 4          | [REL]         | REL-03, REL-04, REL-07, REL-10, REL-11, REL-12                         |
| 4          | [SEC]         | SEC-01, SEC-07, SEC-08, SEC-09, SEC-12                                 |
| 5          | [KNO]         | KNO-02, KNO-09, KNO-10, KNO-11, KNO-12                                 |
| 6          | [FIR]         | FIR-04, FIR-06, FIR-09                                                 |
| 6          | [FLU]         | FLU-08, FLU-12                                                         |
| 6          | [FOD]         | FOD-05, FOD-06                                                         |
| 6          | [MAK]         | MAK-07, MAK-09, MAK-10                                                 |
| 6          | [RES]         | RES-02                                                                 |
| 7          | [BLD]         | BLD-04, BLD-05, BLD-11, BLD-12                                         |
| 8          | [AGR]         | AGR-02, AGR-05, AGR-06, AGR-08, AGR-10, AGR-11                         |
| 8          | [ANI]         | ANI-01, ANI-03, ANI-08, ANI-09, ANI-12                                 |
| 8          | [ART]         | ART-01, ART-02, ART-07, ART-08, ART-10                                 |
| 8          | [COM]         | COM-03, COM-06, COM-09, COM-10                                         |
| 8          | [COOP]        | COOP-01, COOP-05, COOP-06, COOP-10, COOP-11                            |
| 8          | [ECO]         | ECO-04, ECO-06, ECO-08, ECO-11                                         |
| 8          | [VEH]         | VEH-03, VEH-04, VEH-05, VEH-07, VEH-12                                 |
| 9          | [AUT]         | AUT-02, AUT-04, AUT-05, AUT-07                                         |
| 9          | [DEF]         | DEF-01, DEF-02, DEF-03, DEF-05, DEF-06, DEF-11                         |
| 9          | [LAW]         | LAW-04, LAW-05, LAW-06, LAW-07, LAW-08, LAW-09                         |
| 9          | [MAG]         | MAG-01, MAG-02, MAG-03, MAG-04, MAG-06, MAG-07, MAG-09, MAG-10, MAG-11 |
| 9          | [MND]         | MND-05, MND-07                                                         |
| 9          | [SOC]         | SOC-01, SOC-03, SOC-04, SOC-06, SOC-07, SOC-09, SOC-10, SOC-11, SOC-12 |

## 4 Detail — 83 actions

| Workstream | Source domain | Action IDs                                     |
| ---------- | ------------- | ---------------------------------------------- |
| 1          | [BOD]         | BOD-02, BOD-03, BOD-10, BOD-12                 |
| 1          | [INV]         | INV-05, INV-09, INV-11                         |
| 1          | [OBS]         | OBS-07, OBS-11                                 |
| 3          | [CARE]        | CARE-06, CARE-07, CARE-12                      |
| 4          | [OBJ]         | OBJ-01, OBJ-10, OBJ-11                         |
| 4          | [REL]         | REL-02, REL-06, REL-08                         |
| 4          | [SEC]         | SEC-10                                         |
| 5          | [KNO]         | KNO-05, KNO-06, KNO-07, KNO-08                 |
| 6          | [FIR]         | FIR-03, FIR-07, FIR-08, FIR-10                 |
| 6          | [FLU]         | FLU-01, FLU-05, FLU-06, FLU-09, FLU-10, FLU-11 |
| 6          | [FOD]         | FOD-04, FOD-07, FOD-08, FOD-09, FOD-11, FOD-12 |
| 6          | [MAK]         | MAK-04, MAK-05, MAK-06, MAK-11                 |
| 6          | [RES]         | RES-04, RES-11, RES-12                         |
| 7          | [BLD]         | BLD-07, BLD-08, BLD-10                         |
| 8          | [AGR]         | AGR-03, AGR-04, AGR-09, AGR-12                 |
| 8          | [ANI]         | ANI-04, ANI-05, ANI-11                         |
| 8          | [ART]         | ART-04, ART-05, ART-06, ART-11, ART-12         |
| 8          | [COM]         | COM-08, COM-11                                 |
| 8          | [COOP]        | COOP-03, COOP-04, COOP-08, COOP-12             |
| 8          | [ECO]         | ECO-03, ECO-07, ECO-09, ECO-10                 |
| 8          | [VEH]         | VEH-11                                         |
| 9          | [AUT]         | AUT-06                                         |
| 9          | [LAW]         | LAW-01, LAW-02, LAW-03, LAW-10, LAW-11, LAW-12 |
| 9          | [MND]         | MND-08, MND-12                                 |
| 9          | [SOC]         | SOC-02, SOC-08                                 |

## 5 Specialist — 58 actions

| Workstream | Source domain | Action IDs                                                                                     |
| ---------- | ------------- | ---------------------------------------------------------------------------------------------- |
| 1          | [NAV]         | NAV-12                                                                                         |
| 3          | [CARE]        | CARE-04, CARE-09                                                                               |
| 6          | [FIR]         | FIR-11, FIR-12                                                                                 |
| 6          | [FLU]         | FLU-07                                                                                         |
| 6          | [RES]         | RES-10                                                                                         |
| 7          | [BLD]         | BLD-09                                                                                         |
| 8          | [VEH]         | VEH-08, VEH-09                                                                                 |
| 9          | [AUT]         | AUT-08, AUT-09, AUT-10                                                                         |
| 9          | [DEF]         | DEF-04, DEF-07, DEF-08, DEF-09, DEF-10, DEF-12                                                 |
| 9          | [MAG]         | MAG-05, MAG-08, MAG-12                                                                         |
| 10         | [COL]         | COL-01, COL-02, COL-03, COL-04, COL-05, COL-06, COL-07, COL-08, COL-09, COL-10, COL-11, COL-12 |
| 10         | [SYN]         | SYN-01, SYN-02, SYN-03, SYN-04, SYN-05, SYN-06, SYN-07, SYN-08, SYN-09, SYN-10, SYN-11, SYN-12 |
| 10         | [TMP]         | TMP-01, TMP-02, TMP-03, TMP-04, TMP-05, TMP-06, TMP-07, TMP-08, TMP-09, TMP-10, TMP-11, TMP-12 |

[NAV]: actions.md#nav-destinations-and-traversal
[REL]: actions.md#rel-relational-and-persistent-movement
[OBS]: actions.md#obs-perception-and-investigation
[BOD]: actions.md#bod-posture-and-embodied-expression
[COM]: actions.md#com-communication-and-signals
[MND]: actions.md#mnd-private-cognition-and-intentions
[INV]: actions.md#inv-possession-transfer-and-containment
[OBJ]: actions.md#obj-object-operation-and-manipulation
[RES]: actions.md#res-gathering-and-material-acquisition
[MAK]: actions.md#mak-making-repair-and-disassembly
[BLD]: actions.md#bld-construction-terrain-and-placement
[FIR]: actions.md#fir-fire-heat-and-energy
[FLU]: actions.md#flu-fluids-mixtures-and-environment
[FOD]: actions.md#fod-food-consumption-and-domestic-care
[AGR]: actions.md#agr-plants-cultivation-and-ecology
[ANI]: actions.md#ani-animals-and-organism-behavior
[CARE]: actions.md#care-bodily-care-and-rescue
[SOC]: actions.md#soc-relationships-and-social-attempts
[COOP]: actions.md#coop-cooperation-and-shared-activities
[ECO]: actions.md#eco-exchange-services-and-logistics
[LAW]: actions.md#law-fictional-institutions-and-obligations
[SEC]: actions.md#sec-property-secrecy-and-infiltration
[CBT]: actions.md#cbt-conflict-defense-and-tactical-action
[VEH]: actions.md#veh-vehicles-mounts-and-transport
[ART]: actions.md#art-performance-and-play
[KNO]: actions.md#kno-records-teaching-and-discovery
[AUT]: actions.md#aut-routines-monitoring-and-automation
[MAG]: actions.md#mag-actions-under-magical-constitutions
[SYN]: actions.md#syn-machines-space-and-synthetic-life
[COL]: actions.md#col-collectives-and-unusual-bodies
[TMP]: actions.md#tmp-time-identity-and-unusual-realities
[DEF]: actions.md#def-deliberate-invention-and-owner-authoring
