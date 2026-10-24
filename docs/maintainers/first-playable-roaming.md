# First-playable roaming delivery

| Status      | Current progress                                                                                                                                            | Last updated |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Native ecology, optional human supply inputs and ordinary Main are installed; independent trips, pacing, performance and remaining qualification stay open. | 2026-10-22   |

[Feature specification](../projects/first-playable-roaming-feature-spec.md) · [Technical design](../projects/first-playable-roaming-tech-design.md) · [Authored rules](../worlds/base/first-playable-roaming.md) · [Limits](../limits/first-playable-roaming.md). This owns the selected ND06/ND11 roaming slice, coordinated by [FPV](first-playable-validation.md). It does not reopen the completed stag or close CTR escape qualification.

Native implementation now shares the existing animal action, alarm, route preparation,
stock, remains and status owners. The focused grazing journey consumed one actual
pasture unit in 90 game seconds; its current saved result confirms exactly the
selected metabolism rate. A controlled remains check preserves bones, debits one
meat and refuses a second debit using the old remaining-yield record. These checks
do not establish predator success, independent human trips, ordinary Main pacing
or player experience. Existing unchecked exits below remain controlling.

## RW01 — Compile profiles and establish one animal work owner

- [x] Extend the existing build-time config compiler and installed native definitions for ecology/diets/routines/strikes. Validate references, units and profile-specific fields. No runtime YAML/I/O or expressions.
- [x] Reconcile animal/threat/CTR components into one movement arbitration path. Update prediction, execution, save validation and all current callers together without legacy adapters.
- [x] Preserve the original stag and bird profiles; install new ordinary wildlife only in the selected Main opening.
- [x] Compile the optional moving-preparation strike discriminator and its single referenced locomotion definition; preserve stationary-strike admission semantics and current-format validation for other profiles.
- [x] Exercise a non-animal moving strike with different body/start/contact/work values and no hunt owner; require a hunt linkage only when that controller actually owns the action.

**Dependencies:** FPW01 compiler/initialization contract and delivered CTR03–CTR04 escape owner. The [combined sequence](../projects/first-playable-world-tech-design.md#implementation-order-and-independent-task-boundaries) supplies these in earlier phases of the same assignment. **Exit:** native profile/definition fixtures and current-format state prove optional installation and a non-hostile alternate need profile; no simultaneous movement owners.

Current-format profile admission also rejects an existing categorical attribute as a need; actual numeric charge feeding/continuation and Main configuration still pass. The alternate charge-powered scavenger now passes actual finite feeding, one-rate charge drain and complete cold continuation with no hunger, pack or hunt. The non-animal moving-strike contrast also passes. These are controlled native contract checks; Main pacing and wider integrated/performance gates remain open. See the [combined evidence](../verification/first-playable-world.md#combined-busy-work-and-alternate-world-contracts--october-20).

## RW02 — Needs, finite feeding and physical routine

Native control transfer now retires pending food-search work. Saved meals must
match the exact installed diet, permitted source and finite duration; current
source loss remains a runtime interruption. Controlled malformed-record and
last-unit/cold-continuation checks pass in the [requested review](../verification/first-playable-world.md#requested-complete-implementation-review--october-20).

Routine travel now prefers familiar places where the animal personally saw suitable food. The native Main check covers learning while fed, actual travel after a hidden depletion, visible depletion removing the preference, unchanged file/PostgreSQL continuation and randomness, and malformed current-record refusal. Controlled body positions/fullness and delayed unrelated animal reviews isolate the mechanism; ordinary feeding/pacing and wider qualification remain open. See the [connected evidence](../verification/first-playable-world.md#personally-observed-food-and-routine-travel--october-20).

- [x] Bind authored animal fullness/rates and rest/forage choices through existing attribute/action owners. Replace blanket metabolism applicability with mutually exclusive profile conditions; verify exactly one rate. Add raw-meat nutrition 24 with human diet refusal retained and finite in-place pasture.
- [x] Add exact partial corpse-yield consumption to the remains owner; harvest receives only remaining yields. Exposed item/resource consumption remains atomic under competition.
- [x] Implement known-anchor travel, empty-source evidence and pending/blocked recovery through ordinary navigation.
- [x] Install exact varied initial prey fullness once, without timers, stock renewal or reapplying initial values on restore.
- [ ] Qualify early/later ordinary pasture visits and pacing; controlled feeding and continuation checks do not establish this.

**Dependencies:** RW01, SV manufacture/food definitions and FPW layout. **Exit:** actual feeding and starvation paths, two consumers competing, rot at completion, no duplicate meat, blocked/pending routes and restored partial work all have truthful outcomes.

Two admitted timed meals now compete for the same last corpse-meat unit through
actual Main action/completion owners. Exactly one consumes it and gains nutrition;
the other gains none, bones remain, and halfway cold continuation agrees. Initial
positions/fullness/stock are controlled. Actual rot-owner interruption also passes
under a controlled one-second decay law, and feeder death leaves food unconsumed;
both cold continuations agree. Main's ordinary decay cadence and broader feeding/
pacing remain open; see [integrated interruptions](../verification/first-playable-world.md#integrated-interruptions-and-configured-repository-check--october-20)
and [grouped evidence](../verification/first-playable-world.md#physical-outcome-display-and-competing-meals--october-20).

Failed foraging movement now uses the installed blocked-route wait rather than
immediately choosing another walk. Existing hunt/regroup deadlines and traveled
distance survive the wait and cold restoration. The complete camp's actual gate
also stops a walking person and prevents wolf/bear contact during preparation;
open-gate controls still injure. These are controlled software cases, not
independent willingness or encounter-pacing evidence. [Current checks and failed
capacity gates](../verification/first-playable-world.md#final-movement-and-geometry-corrections--october-22).

## RW03 — Perceived pack hunting and local bear danger

Moving-strike restoration now checks the installed preparation duration, remaining
work, absolute release deadline and non-future observation time together. Three
contradictory current records are refused; the valid non-animal partial attack's
cold continuation is unchanged. See the [requested review](../verification/first-playable-world.md#requested-complete-implementation-review--october-20).

Flat diagnostic wolf–hare contact and real corpse feeding now pass with unchanged profiles, original impact/recovery deadlines and restored moving preparation. Moving attacks refresh current sight within their physical contact margin; excessive endpoint subdivision is removed. Negative, pack, gate and performance cases remain open. See the [combined evidence](../verification/first-playable-world.md#complete-main-and-personal-agreement-integration).

- [x] Implement authored prey eligibility, two-wolf biped quorum, bounded visible-only regrouping, six-point visible-packmate approach and the additional known western hunting ground. Preserve actual separation and no hidden companion/target tracking.
- [x] Implement the moving contact strike through one action/motion owner: admission within4m, full120-game-second cue, current observed pursuit, actual1.2m contact, existing accuracy/impact, persistent240-second recovery and shared144m/1,800-second hunt budget. Keep prediction/execution consistent across native boundaries and all callers.
- [x] Permit ordinary deer predation to include the original territorial stag; preserve initial scenario/cache/mechanics without a named immunity or scenario knowledge.
- [x] Add bear territorial profile through the existing threat family, without cloning the stag's scenario rules.
- [x] Give CTR alarm/escape priority on fresh harm through one route/strike owner.
- [ ] Finish the remaining pack/bear wall-and-gate collision cases. Chosen travel, closure during real contact preparation, ordinary-wall occlusion/detours and cold continuation pass for both wolf and bear bodies on the earned camp. Native joining stops when the gate hides the companion; controlled hunger/night/quorum/company cases and three distinct approaches also pass with cold continuation. Independent pack/territorial conduct and the wider lifecycle matrix remain open.

**Dependencies:** RW02, CTR's actual impact/escape work, SH wall/gate geometry. **Exit:** a possible clear-ground catch from4m and failed distant/blocked hunts, unseen target, occluded packmate, genuine encircling possibility, retreat, injury, dead/replaced target and open/closed gate scenarios pass. Include cancellation during preparation and movement during cooldown without another premature bite. Mechanical fixtures are labeled.

## RW04 — Independent human supply trips and discovery

Supply considerations use the shared manufacture input totals, including different
roles consuming the same material. Running crafts have already spent their
inputs and do not create a second material shortage. Controlled queued/running
craft checks pass in the [requested review](../verification/first-playable-world.md#requested-complete-implementation-review--october-20);
independent travel and discovery evidence remains open.

- [x] Compile Kest/Orin's authored opportunity inputs without forced plans or dialogue. Read their own stock/known places and ordinary needs once per decision.
- [x] Include the existing central fiber source as personally known uncertain material geography, offered only for an actual useful resource purpose; no forced westward trip or new camp knowledge.
- [x] Integrate existing independent choices, current agency/outing work, travel, actual camp perception and CP cooperation/withdrawal.
- [x] Preserve provider failure/accounting/staleness; no shortage-triggered retry loop, hidden player location or scripted raid.

**Dependencies:** FPW layout, CP offers/episodes, SPK evidence, CTR human response. **Exit:** native evidence fences and a separately authorized configured-provider episode trace purpose → independent choice → real travel → actual discovery → independent outcome. A forced fixture does not close the last criterion.

## RW05 — Continuation and understandable presentation

Ordinary bear travel now remains available after earlier routine trips: idle
movement no longer spends or inherits an exhausted territorial pursuit allowance.
The actual retained bear starts its next routine trip toward food, with identical
cold continuation; exhausted pursuit/search and the one terminal return attempt
retain their limits. The shared native regression, all 19 affected kernel tests,
TypeScript and production build pass. This changes actual roaming workload; it
does not qualify sustained speed, natural encounter pacing or player experience.
See the [complete review evidence](../verification/first-playable-world.md#requested-complete-implementation-review--october-20).

Visible animal descriptions refresh with actual feeding cancellation and changes
between resting and routine activity. The warm server projection passes these
changes immediately, with no unrelated tick or private needs disclosed.

Focused current-format and movement evidence now covers an actually visible falling packmate, support loss during admitted joining, identical cold continuation/randomness, independent malformed timing/distance records, and the complete retained Main hunt/meal checkpoint. These are native correctness checks with controlled support/fullness in the corner case, not natural pack quality or independent human travel. See the [combined review fixes](../verification/first-playable-world.md#request-schema-and-native-continuation-review-fixes--october-20).

- [x] Project visible posture/attack preparation and the controlled actor's actual work/results through existing surfaces; hide private needs/plans.
- [x] Persist original deadlines, target/life, food debits, chosen route and random choice. Handle death, removal, definition change, restored authority and partial native intervals.
- [x] Restore before/after moving preparation, actual impact, sight loss and recovery without repeated cues/damage, rerolls, reset pursuit limits or two active movement owners; compare partitioned prediction/execution. The [current movement review](../verification/first-playable-world.md#final-movement-and-geometry-corrections--october-22) includes actual contact/recovery, five interruption causes and exact cold/partitioned continuation.
- [ ] Measure complete native/server callers and geometry invalidation; share compatible immutable preparation without sharing private perception.

**Exit:** focused current-format restoration, privacy, interruption and changed-geometry checks pass; actual measured costs and remaining device/population gaps are recorded.

## RW06 — Ordinary encounter and return qualification

- [ ] Run ordinary Main journeys with food, camp, people and danger; distinguish authored test setups from natural encounters.
- [ ] Observe avoidance, unscripted meetings, legitimate refusal, fights/retreat and actual continuing consequences across suitable sessions.
- [ ] Observe early/later prey feeding, actual pack separation/regrouping, finite-food depletion and readable human response to moving bites. Do not claim successful hunting or fair danger from paper speed arithmetic alone.
- [ ] Feed findings into FPV; retain missing behavior/pacing/player evidence explicitly.

**Exit:** named build and full-path evidence support the selected behavior, with costs, interventions and unrun coverage. Fun and wanted return require real player observations; no encounter quota or forced outcome closes this task.
