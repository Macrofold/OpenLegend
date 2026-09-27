# Embodied survival verification

September 27, 2026, local macOS arm64, Node 22.23.2. Source base: `main` / `origin/main` at `412b5b480b4911d9977de73168c6072e2c023b83`, plus the uncommitted implementation. All worlds/databases were disposable. Existing saves were not reset. [AG13](../maintainers/agent-agency.md#ag13--embodied-survival-demonstration) remains **incomplete**: no live unprompted Jev hunt, no live Jev-selected miss retry, and no successful browser visual check.

## Native and existing-check evidence

A consolidated no-provider scenario used real domain transitions, collision and Recast navigation, plus a separate PostgreSQL service close/reopen check. Actual observed passes:

- Fresh Ada has no operational goals, fullness 35 and one knife. A direct chosen strike approaches the ordinary deer and reaches an impact; fixtures with accuracy zero/one produce a miss/hit and zero/eight damage against deer/hare. Own awareness references the real `struck` event.
- Four separately requested strikes against fleeing deer produced miss, hit, miss, hit. A second installed club profile applied four damage through the same executor. These are explicitly commanded mechanics, not spontaneous choices.
- Cancellation before impact causes no hit. Cancellation after impact retains the recovery deadline. Equipment loss, target death and definition changes stop unfinished work; out-of-range impact misses with zero damage and no random draw. Equivalent six-second versus six one-second wind-up advances preserve outcomes/randomness (transaction sequence numbers naturally differ).
- JSON and PostgreSQL reopen during recovery preserve committed outcome, phase, deadline and RNG state; completion does not reroll or apply damage again. PostgreSQL also preserves condition episodes and the latest inventory page/cursor.
- Native advancement does not seek/eat food, even with berries in inventory. Condition checks cover initial/worsening, repeated reconciliation, small boundary oscillations, recovery/rearm, pending disabled cognition and one private notice when capability returns. A charge/shutdown fixture remains alive and uses the generic band mechanism without hunger/death semantics.
- Another observer receives no condition episode, inspection cursor, recovery deadline or owner-only condition labels. Wind-up and recovery presentation do not track hidden prey. Explicit inventory paging respects 16 items/8,000 bytes, permits the second page, retains selectable page items and rejects a stale cursor after custody revision changes.
- A fixture-only typed judge selected the exact equip→deer-strike offer through the real `AiDirector`/response/plan path. The sequence equipped at time zero, approached and missed at roughly 96.91 simulation seconds, then completed recovery. This caught and fixed fresh-world target exposure initialization; fixture execution dispatched no provider calls and establishes no model quality.

The five focused existing files `context.test.ts`, `action-catalogue.test.ts`, `ai-director.test.ts`, `kernel.test.ts` and `boundaries.test.ts` pass **53/53** after the final observation/cursor changes. They use explicit disposable PostgreSQL, no provider keys and zero AI budget. Fixture updates add needed berries/goals explicitly rather than relying on removed starter content. The hearing fixture explicitly whispers and checks that secret content is absent, while allowing an indistinct-speech observation. No new automated suite was authored. Pinned Prettier, TypeScript checking, production build and generated-configuration checking pass. The build retains existing browser-externalization/large-chunk warnings. The sandbox blocked the tsx CLI’s local IPC socket; the build succeeded with approval and the same configuration checker succeeded via `node --import tsx`. Full suites/CI were not run.

## Live Jev trials

Provider: Macrofold `/v1/inferences`, configured saved OpenRouter connection, reported model **`typesafe/jev-1.13-20260917`**. No Worker/native harness was launched. Scenario seed 1086; no player hunting instruction or injected operational goal. Generation/reflection/embeddings were disabled for strict runs, with a throwing generation sentinel. Across all **100 recorded real Jev calls**, no generation was dispatched.

The final `cognition-questions-v9` runs used the authored identity/body facts and the same 0.7 independent-action threshold. Routing and action rating used two calls per considered opportunity:

| Scenario                                               | Observed result                                                                                          | Calls | Application estimated USD |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ----: | ------------------------: |
| Lean camp, no carried food or available nearby berries | Seven opportunities all deferred, from fullness 35 through zero and health about 10.6; no attack or goal |    14 |                  0.004613 |
| Three carried berries                                  | Selected eating; actual native consumption                                                               |     2 |                  0.000641 |
| Two berry patches with six berries each                | Selected gathering; two berries obtained after about 66.36 simulation seconds                            |     2 |                  0.000648 |
| Knife removed                                          | Deferred, no attack                                                                                      |     2 |                  0.000574 |
| Prey moved outside the visible area                    | Deferred, no attack                                                                                      |     2 |                  0.000515 |

Earlier recorded calls tried the original mutually exclusive selector and successive context/rubric revisions. None established an autonomous hunt. Early food selection exposed a response-envelope validation error; those trials are failures, superseded by the actual successful food runs above. A no-prey fixture initially used an incorrect support identifier; the final comparison was rerun on `terrain` and again deferred. Intermediate/pre-fix trials are included in the aggregate accounting, not discarded as successes or pooled as a calibrated benchmark. An early maintenance path reached the throwing generation sentinel and retained a $0.25 application reservation without dispatch; the strict mode now blocks that route before execution.

Recorded Jev latency across the mixed 100-call development sample: **p50 556 ms, p95 1,055 ms, min 418 ms, max 1,803 ms**. This is per-call local observed latency, not complete cognition latency or a stable production percentile. Summed provider-reported estimated cost is **$0.032249742**; application rounded totals differ slightly. The conservative local ledger reserved $0.05 before every call and never released it, exhausting its explicit **$5 trial allowance**. That is accounting headroom, not $5 billed. Including the uncertain $0.25 maintenance hold remains below the standing $10 task ceiling. Provider settlement was not independently audited.

These observations support ordinary Jev food choices and low call cost. They do **not** establish a general inability of Jev to hunt, nor reliable survival, novel goal formation or autonomous harvesting/cooking. The owner explicitly rejected generation solely to form an intention; strict acceptance remains unchanged.

## Inventory preparation

One cold plus eleven warm samples per world measured permitted observation → candidate descriptions/hashes → JSON serialization on the same shared host. The fixture created separate one-unit stone lots in Ada's indexed custody; other starter possessions remain. This excludes SQL recall, provider calls, full action discovery and the browser. Warm “p95” below is the maximum of eleven samples, not a stable tail estimate.

| Owned lots | Possession candidates | Prepared candidate JSON bytes | Cold ms | Warm p50 ms | Warm max ms |
| ---------: | --------------------: | ----------------------------: | ------: | ----------: | ----------: |
|      1,006 |                 1,006 |                       330,947 |   10.59 |        3.14 |        4.89 |
|      8,006 |                 8,006 |                     2,605,947 |   40.25 |       25.90 |       30.38 |
|      8,306 |  16, explicitly paged |                        10,298 |   30.43 |       14.18 |       15.35 |

The final model request has separate byte/selection limits; candidate JSON above is intermediate preparation, not bytes sent to Jev. Before the page fallback, 8,306 lots refused preparation and prevented autonomous inspection; that is fixed. Earlier runs had substantial shared-host variation (an 8k warm maximum around 304 ms); these samples are not a controlled performance-improvement claim. Observation still scans/copies scoped inventory, and inspection sorts it. Shared definition facts and request observations avoid duplicate work but do not provide sublinear retrieval. Weapon-by-target action fan-out and changed-actor/idle-population fairness remain unqualified under [CG04](../limits/cognition.md#cg04) and AG06/AG07.

## Browser and remaining gaps

A zero-budget disposable production server served the sign-in screen and valid state responses. IAB could not progress after sign-in; Chrome briefly showed entry progress before automation lost its browser attachment. Reconnecting the owned tab failed again. No successful game interaction, condition-bar visual or melee-animation inspection is claimed. The owned server and database were shut down; unrelated runtimes were left alone.

[AC09.6](../maintainers/action-capabilities.md#ac09--expand-ordinary-use-through-domain-owned-families) retains player/menu/animation acceptance. EPR04/AG06/AG07 retain complete direct-writer/sleep/long-advance and in-flight/restore scheduling qualification, relevant-versus-unrelated item wakeups and multi-actor work/fairness. Actor-proposed interest descriptors beyond the existing compiler remain unimplemented. These are unfinished agreed integration/qualification, not waived requirements. The central live attack/retry criterion remains blocked by observed model deferrals within the selected trial budget.
