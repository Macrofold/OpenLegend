# World-configured survival verification

This report records the October 2 PW07 domain/server work against the inherited planning base `8005f7c7`. Implementation uses `oct2-eng-2`; the reviewed performance-fixture builder from Engineer 1 (`fe85785b45d5eb3fbf95c795e92187c36bce91d3`) was consumed as `9ad34ce585741e9e47cbfbecf6ab83d216486fe9`. The domain/protocol contract implementation is `edd4d9ad6422074175f0f8de4c4770097c45660b`; the matching server consumer commit is `937c8c44fd8c71d82c66bcef9eec2f70ef9369c8`. These are native, fixture and disposable-PostgreSQL checks. No provider calls were made: additional and cumulative paid cost for this survival scope are $0.

[Approved stages](../projects/world-configured-survival.md) · [PW07 brief](../projects/next-playable-week/survival.md) · [Tracker](../maintainers/next-playable-week.md#pw07--world-configured-survival) · [Body and survival owner](../worlds/base/survival.md) · [Status runtime](../status-effects.md).

## Outcome comparison

The requested reusable tool is [compare-world-survival.ts](../../scripts/compare-world-survival.ts). It loads native APIs from the current source and an explicitly supplied historical source tree. Historical code is exercised only for comparison; no production save reader, conversion or automatic replacement is added.

Run with `AI_BUDGET_USD=0 node --import tsx scripts/compare-world-survival.ts --baseline-root /tmp/openlegend-pw07-baseline --baseline-commit 8005f7c7`. The private baseline tree was extracted from that exact commit, with the installed dependency runtime shared by symlink. Both collision runtimes were initialized under Node v24.13.0, then the 27-pair comparison was repeated successfully under the pinned v22.23.2 runtime. Seed 73 is used throughout.

All 27 comparisons pass: exhausted player, simultaneous NPC deaths, food emptying during an interval, sleep while starving, fatal blow while starving, fatal blow with the final food interval, an animal at zero energy in flight, eating while starving and camp recovery. Each runs with 30-second, one-second and whole-run offers. There are 24 exact matches and three accepted final-food differences. Raw health, food/energy values, alive/incapacitated flags, body revisions, positions, remains, saved randomness and event occurrence order/content/clock/audience match without numeric tolerance or rounding.

The fatal-blow fixture with initially 35 food now receives the final metabolism interval. Its before/after final food is `34.999999997 → 34.910000000000004` with 30-second and whole-run offers; with one-second offers it is `34.913 → 34.91`. This is the already accepted ordering consistency change. The formerly unused energy-level-5 stop is absent. A native animal's unused former food value is intentionally absent from the new model.

Internal new status episodes consume monotonic identities. The comparison excludes opaque event IDs, sequence/absolute order counters and action/activity/effect/episode IDs inside event data; it retains the actual event occurrence order and remaining payload. This is a semantic event comparison, not identity equality between incompatible models. That limit is explicit in the tool and does not excuse a value, lifecycle, body-revision or occurrence-order difference.

## Native consumer and integrity checks

The focused existing `kernel.test.ts`, `god-tools.test.ts` and `mind.test.ts` checks pass **37/37**. Their prior recipe fixtures were mechanically converted by the PW02 owner to the current candidate format; expected survival behavior was retained.

A small native scenario exercises 40 assertions through the shared state writer, command execution, creator editing/revival and actual world advance. On a 36-point body, 18 raw health reads as 50%; a 25% edit writes nine raw points. Recovery equality at 30% health and 20 food is unavailable, recovery below 30% is available, and the 65% floor becomes 23.4 raw points. Maintenance accepts equality at 40% health/30 food; commit and reflection retain their separate energy boundaries 15 and 30. Quiet configured damage converts health-percentage units to raw points and produces no injury event.

The whole clockwork composition has no installed food/energy definitions, hunger/rest rules or dream policy. Every initial person and animal omits those attachments. Its owner projection uses integrity, charge with maximum 240 and disposition. Actual recharge advances and spends compatible finite stock while respecting the configured bound; multiple eligible bodies may recharge from the same supply. Native creator hare spawning produces no uninstalled meter, and JSON same-format validation retains charge revisions. Eating and camp recovery are absent and refuse rather than fabricating a service. An omitted optional energy meter reports uninitialized rather than zero and remains a valid current world.

An independently reviewed scenario applies several health-changing statuses to a starving NPC. A lethal rate ends all captured episode work roots; later captured rules do not recreate them. Native work validation and JSON current-format world validation pass after death, without an injury event. Independent review also positively verified refusal of forged unknown consumption-item/carrying-property references, nonfinite raw health even when no health meter is installed, removed native aliases/needs capability, and ordinary recovery of a dead player. Ordinary creator health editing leaves death intact; the separate creator revival operation fills the configured applicable meters.

The server agent exercised 11 groups through real `WorldService` and a disposable PostgreSQL repository: a 36-point body projects raw 18 as 50, a creator edit to 75 writes raw 27, out-of-range 101 and unbound meter edits refuse atomically, and stale manifest/generation inputs refuse. An explicitly edited meter group preserves its prior creator override of simulated drift. Old cognition body evidence refuses; named reconsideration inputs are preserved. Persisted current state validates and reopens. The whole clockwork world projects charge 48, omits food/energy and dreaming, has no physiological body-fact hunger or quick suggestion, and its installed-policy authoring metadata/graph contain no default-physiology claim or nonexistent sleep dependency. Ada's unchanged authored trait IDs remain accepted, so a valid meter edit does not fail unrelated trait validation.

Nine native server-preparation/observation groups cover maintenance food equality 30, reflection energy 30 versus commit 15 and intake 15/10; complete inventory absence wording; the prior raw-meat carrying interpretation; and a paged 8,199-lot inventory that makes no complete absence claim. The clockwork prepared prompt has no food/exhaustion body fact. A reservation-time meter change prevents dispatch and records a proved-undispatched zero-cost receipt; a completion-time change settles the original simulated dispatched receipt exactly once before refusing publication.

Four additional groups use actual SQL history reads and a held real mutation writer for learned methods: a queued food drop from 35 to 29 before dispatch causes zero judge calls and no assessment/cursor/method writes; a queued drop after simulated completion settles once and refuses learning while retaining the assessment against automatic retry; cancellation during a held history read publishes no method; an unchanged control publishes the discovered method and personal acquisition through their native owner. All provider results/receipts here are fixtures: zero real provider calls and $0. These checks establish fencing and native publication behavior, not live model quality. The real manual-checkpoint chain also passes for wilderness and reservoir: worker-backed capture, read, authorized restore and fresh PostgreSQL/service reopen preserve exact compiled recipe pins, a 36-point body at raw health 18, sparse meters and reservoir charge 137/240 without food/energy or dreaming. Post-cut changes rewind and the new generation opens paused. Integrity-valid preceding-marker fixtures refuse without changing their metadata/body bytes, active world or persisted world, including after reopen. Combined private/UI/browser checks retain their separate pending gate.

## Matched flock cost

The matched workload uses Engineer 1's reviewed fixture builder against both actual source revisions, rather than loading a fixture produced under the old model. Manifest: seed 73; 60 added people, 100 added deer, 48 staggered flying birds, 500 added static roots; 96×96 crowded map; 60 actual game seconds of warmup, then 300 measured game seconds, with 30-second offers and maximum 4,096 intervals. Including the authored start, it has **861 entities, 63 people and 49 flyers**. Node is pinned to **v22.23.2**. Snapshot freezing and native admission are retained; provider calls and paid cost are zero.

A small private consumer of the existing fixture builder advances actual game time, times only native advance/freeze, then counts the existing saved-world diff operations and their serialized bytes outside that timing. It retains the same seed, fixture placements/routes, warm history and current rates. This is a survival cost comparison, not a new benchmark framework or production scalability qualification. The raw traces, snapshots and JSON results stay outside the repository.

The measured 300-second run has ten calls in each source. Every call's elapsed game time, saved randomness, person health/food/energy/body revisions and emitted event content match. Deterministic counts are:

| Measurement                 | Planning baseline |           PW07 |
| --------------------------- | ----------------: | -------------: |
| Saved-world diff operations |            22,647 |         26,427 |
| Serialized diff bytes       |         2,290,106 |      2,838,127 |
| Resident status records     |               215 |            278 |
| Live native work roots      |               215 |            278 |
| Sparse attribute records    |                 0 |            278 |
| Final world JSON bytes      |        11,101,170 |     11,172,213 |
| Final events / awareness    |    4,068 / 12,104 | 4,068 / 12,104 |

Recorded changes grow **16.69%**, serialized changes **23.93%**, and final world JSON grows **71,043 bytes** (0.64%). The 63 extra active metabolism episodes account for extra status/work records. Sparse records replace removed writable aliases; the baseline's zero sparse records does not mean it had zero meter values. These record counts describe the model serialized by canonical persistence; this native workload does not measure PostgreSQL write latency or bytes on disk.

The unchanged group ceilings are four million predicate checks, 100,000 effects and 100,000 subscriptions. Baseline static per-root admission estimates are 46 checks, eight effects and 13 subscriptions; PW07 estimates are 113 checks, 17 effects and 17 subscriptions. This gives a **conservative installation bound of 5,882 roots instead of 7,692 (23.53% lower)** from the tightest effect/subscription bound. All three survival rules count even when damage is inactive; the body policy adds one installed interface and its predicate/service lookups. Optional recovery/revival/consumption services are charged as lookup work rather than hypothetical writes every interval. This arithmetic is not a demonstrated playable population or a throughput guarantee. The 861-root fixture is admitted under the original ceilings.

Three alternating final-code pairs yield the following native advance/freeze timings. Diff counting and JSON serialization are outside native timing. Wall time includes process contention; CPU time is process CPU. An earlier candidate sample preceded the final static-cost accounting correction and is excluded from this final table.

| Pair   | Baseline native wall / CPU, ms | PW07 native wall / CPU, ms |
| ------ | -----------------------------: | -------------------------: |
| 1      |        19,015.257 / 16,460.726 |    17,003.003 / 16,559.906 |
| 2      |        18,848.687 / 17,243.447 |    18,915.599 / 16,699.837 |
| 3      |        19,788.599 / 17,459.564 |    18,499.324 / 16,680.293 |
| Median |        19,015.257 / 17,243.447 |    18,499.324 / 16,680.293 |

Counts and serialized sizes are identical across repetitions. Median native wall and CPU are 2.71% and 3.27% lower in this local sample, despite extra recorded changes. This narrow comparison does not establish a general speed improvement: warm history, one fixture, co-running engineering processes and full native calls limit interpretation. Median PW07 throughput is about 16.22 game seconds per wall second, below even the normal 60:1 game-time target for this dense fixture. Server yield/queue/network/database/provider work, eight-times-speed headroom and live interaction are not qualified here; PW08 keeps those gates open. The historical prototype's 10–16% change growth and roughly 7% fewer admitted entities per new rule remain historical observations, not today's results. Neither inactive damage rules nor omitted provider work make installed rules free. Work ceilings are unchanged.

## Remaining qualification

Combined domain/server/client acceptance belongs to PW07 and stays open until Engineer 4's editor, bars, quick actions, stale/rejected draft handling, private projections and browser checks pass together. PW06 command/predicate pin integration and PW08 kernel/cache consumption remain coordinated dependencies. This survival report does not close broad world-package delivery, live-law evolution, general physiology, composition or production-scale qualification.
