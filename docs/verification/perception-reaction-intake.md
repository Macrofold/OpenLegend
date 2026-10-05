# Perception changes and reaction intake — verification

- **Date:** 2026-09-28.
- **Branch:** `claude/perception-reactions-090227`, based on `origin/main` `be68b1e0`.
- **Plan:** [perception-reaction intake](../projects/perception-reaction-intake.md).
- **Owners:** [EPR](../maintainers/events-perception-and-reactions.md), [PF](../maintainers/performance.md), [SW08](../maintainers/spatial-world.md).
- **Host:** Node v22.23.2 on a shared 10-CPU macOS machine running several other agents. The load average ranged from 58 to 241 during these runs.

**Every timing below is shared-host evidence.** Before and after runs alternate on the same input, but none of them establishes acceptance or capacity. Digests and counters do not depend on host load.

## How to reproduce

Run from the repository root. The `.cpuprofile` output path and the `OPENLEGEND_PROFILE_TRACE` path must not already exist; the harness refuses to overwrite either.

```sh
OPENLEGEND_PROFILE_TRACE=/tmp/NEW-trace.json \
  node --import tsx scripts/stress-native.ts scripts/performance/scenarios/mixed.json /tmp/NEW.cpuprofile > /tmp/NEW.json
```

Baselines are `git archive` copies of the named commit in a private scratch directory, with dependencies installed offline. The current `scripts/profile-native.ts` is copied into each baseline, so both sides use the same harness. The harness reads domain counters only when the revision defines them.

The report fields added for this work:

| Field             | Meaning                                                                                                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `firstStepMs`     | The cold first step, which contains the first-sight burst when `warmup` is 0                                                                                                                                |
| `counters`        | Domain work counts (below)                                                                                                                                                                                  |
| `awarenessDigest` | Hash of the resident awareness entries per character                                                                                                                                                        |
| `traceDigest`     | With `OPENLEGEND_PROFILE_TRACE`: hash of the per-step hashes of the outcome, the events with ordered audiences, simulation time, RNG state, next ID and sequence. The trace is hashed after the timed loop. |

Identical outcomes mean equal `finalWorldDigest`, `awarenessDigest` and `traceDigest`.

## EPR00 — baseline

### Seed-73 mixed workload

Workload: `mixed.json`, i.e. 10 added people, 20 animals and 300 objects, scattered, 180 one-second steps, no warmup, requested speed 3×. Runs alternate between the two revisions.

| Run          | CPU ms | Wall ms |   p50 / p95 ms | Max step ms |   Headroom at 3× | Events / awareness | Final digest |
| ------------ | -----: | ------: | -------------: | ----------: | ---------------: | -----------------: | ------------ |
| `ce7ef555` 1 |  1,839 |   1,608 |   6.82 / 12.01 |       215.9 |             0.62 |      3,254 / 3,474 | `ec1ff970…`  |
| `ce7ef555` 2 |  1,817 |   1,523 |   6.62 / 10.07 |       238.2 |             0.66 |               same | same         |
| `ce7ef555` 3 |  1,934 |   1,858 |   7.39 / 15.04 |       296.4 |             0.54 |               same | same         |
| `be68b1e0` 1 |  1,963 |   1,667 |   8.29 / 13.52 |        75.2 |             0.60 |          133 / 353 | `fc322a22…`  |
| `be68b1e0` 2 |  2,307 |   6,047 | 11.45 / 126.09 |       435.1 | 0.16 (contended) |               same | same         |
| `be68b1e0` 3 |  1,985 |   1,656 |   8.16 / 12.84 |        77.3 |             0.60 |               same | same         |

- **Median CPU:** 1,839 ms for `ce7ef555` and 1,985 ms for `be68b1e0`. The difference is about 8% on this host, not the tracked 24%.
- **Why the 24% figure no longer applies:** it was measured at `c1330009`. The two revisions now simulate different worlds: 344 versus 376 entities, the September 27 sighting policy, and the 3D spatial runtime. `ce7ef555` is therefore CPU context only.
- **Proof of identical outcomes** in this work compares `be68b1e0` against the candidate change.
- **Neither revision reaches 3×** on this workload.

### Counters

Instrumented `be68b1e0` (stage 1) produced the same final, awareness and trace digests as the plain `be68b1e0`. Counts over the 180 measured steps:

| Counter                                                  |               Count | Meaning                                                                  |
| -------------------------------------------------------- | ------------------: | ------------------------------------------------------------------------ |
| `rootScans` / `rootsVisited`                             |       544 / 187,136 | About 3 full root enumerations per step, about 1,040 root reads per step |
| `observersExamined` / `observersSkipped`                 |          36 / 2,124 | 98% of encounter-phase observer passes reuse unchanged exposure          |
| `spatialBuilds` / `spatialQueries` / `spatialCandidates` | 362 / 2,196 / 5,040 | Point-grid builds, queries and returned candidates                       |
| `senseTests` / `senseCacheHits`                          |         4,114 / 812 | Exact sight tests versus sight-cache reuse                               |
| `eventsRecorded` / `awarenessWritten`                    |           103 / 103 | Recorded occurrences and the awareness entries they produced             |
| `exposureEntries`                                        |                 102 | Newly seen people with memory                                            |

### Where the CPU goes

This is the profile attribution at `be68b1e0`. Immer's own time is attributed to the nearest calling project function.

- **Encounter phase:** `updateEncounters` accounts for about 29% of sampled native time.
  - Most of that is `worldRootEntities(world, true)`, about 18%. It reads every root through the draft, which creates one proxy per root, and then runs Immer `current()` on each changed root.
- **Finalization:** `finishWorld` → Immer `finishDraft` takes about 18%. Every draft child created by those read-only root proxies is finalized again.
- **Status effects:** reconciliation (~10%) and rate integration (~9%) together take about 19%. That code belongs to the time owner.
- **Status-effect reads:** `matchesStatusCondition`, capability contributions and attribute reads go through draft proxies.

So most of the remaining native cost is a fixed charge per root per step: the proxies and copies made to inspect entities that did not change. It is not exposure work.

### Current thresholds and policy roles

This inventory is read from the source at `be68b1e0`. Each value serves a different purpose; none of them is a universal hunger rule.

| Value                                                                                            | Owner                                                             | Role                                                            |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| Fullness bands below 40/30/20/10, and 0; 2-point rearm; hourly critical review below 20          | `worlds/base/attributes.ts`, [BW07](../limits/base-world.md#bw07) | Private hunger condition notices and reminders                  |
| Health below 40 and energy below 25                                                              | `worlds/base/attributes.ts`                                       | Descriptive text only; no condition episodes                    |
| Reservoir concern with a 5%-of-range recovery point                                              | `world-modules.ts`                                                | Private `attribute-concern` crossings for non-native reservoirs |
| Energy below 15 / below 10                                                                       | `ai-director.ts`                                                  | Server scheduling inputs and the "exhausted" cue                |
| Health below 40%, fullness below 30, energy below 30                                             | `cognition.ts`                                                    | Reflection and dream gate                                       |
| Fullness below 30, energy below 15, health below 40%                                             | `mind.ts`                                                         | Consolidation override                                          |
| Health at least 40% and fullness at least 30                                                     | `needs.ts`                                                        | Safe downtime for the learning worker                           |
| Health below 30 and fullness below 20 (raw points)                                               | `kernel.ts`                                                       | Player camp-recovery eligibility                                |
| Importance ≥ 6 or a significant event type                                                       | `ai-director.ts`, `cognition-policy.ts`                           | New-evidence trigger for autonomous thought                     |
| Importance and urgency ≥ 8                                                                       | `ai-director.ts`                                                  | Interruption of an in-progress reply (one retry)                |
| Sleep starts at energy ≤ 0, or below 70 from 22:00 to 06:00; ends at 100                         | `status-effects.yaml`                                             | Sleep (time owner)                                              |
| Person sighting: importance 3, urgency 0, no automatic reasoning; animals and objects not stored | `worlds/base/senses.ts`                                           | Sighting evidence policy (September 27)                         |

### Save/restore invalidation and generation identity

- **Restore generation.** The world service issues a new restore generation UUID on each load or restore. `ActorWork` uses it as its ticket scope, so all tickets reset on restore.
- **Derived caches.** Indexes for exposure, objects, roots and sight are keyed by frozen object identity. A restored snapshot therefore rebuilds them.
- **What a load deletes.** It deletes the `semantic-schedule:*`, `interests:*` and `reflection-queue:*` integration rows. This belongs to the save owner.
  - As a result, every retained important piece of evidence looks unseen after a resume. This conflicts with EPR08, which requires no replayed paid work; it is recorded as an EPR08 gap.
- **New world versus restored world.** A new world runs `initializePerception` and the condition detector. A restored world skips both, so a restart invents neither new sightings nor a new "first hunger".

### Traced flows (source-inspected)

- **Directed speech.** The player's `say` commits a speech event. The director's interactive job runs outside `ActorWork`. Duplicate autonomous replies are suppressed by looking up the completed chat job in SQL on each inspection.
- **A person arriving.** The stationary observer's cache detects the source's movement. The observer rescans and records a private `encounter` onset at importance 3. The observer's `ActorWork` inputs change because the server recomputed visibility. This becomes a thought opportunity only if an interest match changes.
- **An object being acquired.** The observer's membership changes, and nothing is recorded (routine policy). The pickup itself is a separate external event.
- **A need condition episode.** `reconcileConditions` records a private `body-condition` notice at importance 6 and saves the episode in `actor.conditions`. The awareness entry and the changed `actor.conditions` reference mark the ticket dirty. The evidence filter then admits one opportunity.
- **A reflection wake-up.** Maintenance has its own `ActorWork`, the `reflection-queue` rows and `wake`/`defer`. It runs in a separate slot, only when no foreground job is running.
- **Story selection.** `selectStory` expects `acquisition === 'visual'`, but sightings write `true`. So the viewer's own designated introductions are silenced. Stage 3 fixes this.

## PF03/09 — native CPU (stage 2)

### What changed

These changes are behavior-preserving:

- **Read-only view of roots.** The encounter phase's root enumeration no longer creates an Immer proxy for each unread root, and no longer deep-copies changed roots with `current()`.
  - A read-only view returns unchanged roots as their immutable records and roots already changed in this step as their live drafts. The view uses `readOnlyDraftView` in `draft.ts`.
  - This is safe because the phase writes only each observer's own `contacts`, and it reads those before writing them.
- **Capture cache.** Each root's encounter inputs (position, body size, alive, memory, object, outward appearance) are cached per immutable record. The per-slice exposure inputs reuse unchanged copies instead of reallocating them.
- **Boundary freeze.** `freezeWorld` does the same deep freeze for plain data without allocating an entry pair per key.

### Matched results

Runs alternate baseline (`be68b1e0` plus the stage-1 harness) and candidate. Load average was 88–125 during the seed-73 set.

| Workload                          | Run | Baseline CPU ms | Candidate CPU ms | Baseline p50 / p95 ms | Candidate p50 / p95 ms |
| --------------------------------- | --- | --------------: | ---------------: | --------------------: | ---------------------: |
| seed-73 `mixed.json`              | 1   |           2,025 |            1,570 |          8.29 / 14.93 |            6.20 / 9.49 |
| seed-73 `mixed.json`              | 2   |           1,916 |            1,603 |          7.77 / 11.06 |           6.70 / 15.07 |
| seed-73 `mixed.json`              | 3   |           1,962 |            1,667 |          7.95 / 13.02 |           7.11 / 16.99 |
| `mixed-8x.json` (24 s calls)      | 1   |           2,447 |            2,216 |         19.16 / 39.89 |          17.89 / 53.41 |
| `gems.json` (500 crowded objects) | 1   |           1,343 |              876 |          7.46 / 68.34 |           4.04 / 15.45 |

- **Seed-73:** median CPU fell from 1,962 ms to 1,603 ms, about 18%, and median step p50 from 7.95 ms to 6.70 ms.
- **Versus `ce7ef555`:** the stage-2 candidate uses less CPU than the `ce7ef555` context runs (median 1,603 vs 1,839 ms); the `be68b1e0` baseline used more (1,962 ms). The worlds differ, so this is context only.
- **3× is still not reached.** Headroom at 3× is 0.60–0.77. The measured 3× target stays open under PF03/PF09.
- **Tail latency did not improve reliably.** Candidate p95 was lower in one seed-73 pair and higher in the other two, and higher on `mixed-8x.json`. Treat p95 on this host as unresolved rather than improved.
- **The single runs** of `mixed-8x.json` and `gems.json` are indications only.

### Identical outcomes

- **Seed-73 set:** every run in both revisions has final world digest `fc322a22…`, awareness digest `6b6d4df6…` and per-step trace digest `68be3cdd…`.
  - The trace covers each step's outcome, events with ordered audiences, RNG state, next ID, sequence and simulation time.
- **`mixed-8x.json`:** both revisions match on digests `99b8d453…`, `2ef24d5d…` and `fd8537b5…`.
- **`gems.json`:** both revisions match on digests `14cd3947…`, `d11b08fc…` and `69781b7c…`.

### What remains

- **Finalizing changed actors and animals.** Immer walks every key of each modified object: about 18% of samples. This is inherent to the representation (PF08, stage 9).
- **Status-effect reconciliation and rate integration:** about 20%. That code belongs to the time owner and was not changed.
- **`navigationBlocked`** reads each actor through the draft every slice: about 4%. That is navigation code, owned by the time owner.

### Focused existing tests

These seven native domain test files need no database: `kernel`, `mind`, `perception`, `spatial-world`, `god-tools`, `traits` and `boundaries`.

- **Result:** 62 of 64 tests pass.
- **The two failures were already present:** they fail identically on the pristine `be68b1e0` copy.
  - `perception.test.ts`: "sees distant objects across prototype obstacles without extending speech exposure"
  - `spatial-world.test.ts`: "enforces floor and airborne reach and protects private speech through slabs"
  - Both are hearing and speech-exposure assertions (`hearsEntity`), outside this stage's changes.

## EPR01 — typed scope and intake metadata (stage 3)

This scenario was an ad-hoc native script, not committed. It runs the base world at seed 4, with the player moved beside Ada, one step at a time.

### Own designated sighting

- **Before:** the viewer's own private `encounter` was rejected by the story selector with "Disabled or unavailable evidence." The selector checked `acquisition === 'visual'`, but the recorder writes `true`.
- **After:** the sighting reaches the story evaluator. It returns "No story rule matched.", which is the normal policy result.
- **Unchanged:** another viewer's private sighting is still rejected.

### System scope

- `enableActorCognition` now emits `god-cognition-enabled` with scope `system` and an empty audience.
  - No character gains an awareness entry, including the subject.
  - The notice is still kept in world history as a notable control record.
  - The story selector rejects it.
- `schema-migrated` is also marked `system`.

### Creator importance edits

Creator awareness edits now reject importance outside the record's 0–10 scale.

| Importance | Result   |
| ---------- | -------- |
| 99         | Rejected |
| −1         | Rejected |
| NaN        | Rejected |
| 7          | Accepted |

### Save classification

- **Saved authority, no schema change:** the new `system` scope value, which travels inside existing event JSON.
- **Process resources, rebuilt after restart:** intake tickets, reasons and dispositions.
- **Profiling-only:** domain counters.
- **Derived caches keyed by immutable records:** the exposure capture cache.

## EPR03 — exposure deltas (stage 4)

This stationary-observer scenario was an ad-hoc native script, not committed. It uses the base world at seed 4. Ada stays in place while the player is teleported between her position and 100 m away, one-second steps.

| Step                        | Player in view | Ada's episode for the player | Ada's private records                 |
| --------------------------- | -------------- | ---------------------------- | ------------------------------------- |
| Player arrives (t = 2)      | yes            | `1:2:entity-0001`            | arrival at 2                          |
| Player stays (t = 5)        | yes            | same                         | unchanged                             |
| Player leaves (t = 6)       | no             | none                         | arrival at 2, departure at 6          |
| Returns within 30 s (t = 7) | yes            | `1:2:entity-0001` (reused)   | unchanged: no duplicate arrival       |
| Leaves again (t = 8)        | no             | none                         | unchanged: one departure per window   |
| Returns after 41 s (t = 49) | yes            | `48:49:entity-0001` (new)    | unchanged: inside the one-hour window |

- **Seed-73 `mixed.json`:** same event (133) and awareness (353) counts as `be68b1e0`, and no departures (`exposureExits` 0). The final digest changes only because sighting awareness entries now carry their `change` marker.
- **`mixed-8x.json`:** 63 exposure exits. All are animals or otherwise unrecorded under the policy, and the event count is unchanged at 141.
- **Timings:** runs during this stage overlapped a host load average of 264–343 and are not reported.

EPR05 (stage 5) delivers the server-side part: using these domain membership changes as the wake-up signal, and reconsidering visible candidates when goals change.

## EPR05 — one fair intake (stage 5)

**Setup.** This is an ad-hoc server scenario, not committed. It uses the real `WorldService` and `AiDirector` on a disposable PostgreSQL database, with `AI_BUDGET_USD=0` and no provider credentials.

- The injected AI client throws if called; it was never called.
- Six scattered "Profile person" characters are added to the base world. Each director pass admits at most one thought.
- With a zero budget, every admitted thought fails at its spending reservation, before any provider call. That makes fair ordering, cursors and ownership observable at zero cost.

Two practical notes: `CREATE DATABASE` hit the fixture helper's fixed 5-second timeout (57014) on several attempts at host load 214–290. One interrupted run left my own disposable database behind; I identified it by its fixture-clock job timestamps and dropped it.

| Check                         | Result                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Initial admission order       | Ada, then people 0–5 in first-wake order; 0 provider calls                                                                                                                                                                                                                                                                                             |
| Change-fed visibility         | Recompute happens only for characters whose own exposure lists, position or item definitions changed. In one run where only the player moved, 1 of 8 characters with minds recomputed. In the later run below, 8 of 8 did, because the intervening step also moved or re-exposed every character. Previously every character recomputed on every poll. |
| Failed admission              | Considered-evidence cursor stays unset and the attempted opportunity is recorded; 3 further passes did not retry it                                                                                                                                                                                                                                    |
| Directed turn owns its speech | A player's speech with a _failed_ chat job for the addressee: 0 autonomous admissions used that speech                                                                                                                                                                                                                                                 |
| Sleep deferral                | Sleeping character: skip recorded, 0 admissions. After waking, admitted once with the pre-sleep speech as evidence                                                                                                                                                                                                                                     |
| Hungry newcomer (stage 6)     | A spawned person edited to hunger: their first opportunity carried the private hunger notice                                                                                                                                                                                                                                                           |
| Intake accounting             | 43 inspections, 0 failed. The "longest wait" statistic from this run is not reported: it included the player's ticket, which is never inspectable. Queue age now counts only inspectable work                                                                                                                                                          |

**Limits of this evidence:**

- The scenario's populated map was so small that every character already saw the player. So the arrival check shows the recompute count, but not a membership change for a previously blind observer. The stage-4 native scenario covers that case at the domain level.
- It covers one shared slot with zero-cost failures, not provider latency, dense crowds or concurrent players.

## EPR04 — remaining writers (stage 6)

These are ad-hoc native checks on base-world seed 4.

- **Creator health edit to 0.**
  - Candidate: goes through the body owner. It records `death`, Ada is no longer alive, and the body revision advances.
  - Baseline `be68b1e0`: Ada stayed alive at health 0 with no event.
- **Creator spawn.** Runs the condition detector at admission, and the new person's fullness episode exists immediately. Base-world spawns are fed (fullness 75), so they record no notice. Other worlds' spawn definitions get an `initial` notice on creation.
- **Later hunger on a spawned person.** A creator hunger edit reports `worsening` (severity 2, private), since the person was created fed.
- **Reservoir concerns.** The private `attribute-concern` record now uses the same "can notice" rule as body conditions. A sleeping or incapacitated character keeps the physical latch and its projected concern text, but gains no manufactured memory.
- **Superseded notices.** The thought scheduler ignores a body-condition notice from a replaced condition policy version, as well as one whose severity has since dropped.

## EPR06 — persistent stimuli (stage 7)

This is an ad-hoc native check on base-world seed 4. Ada is placed 2 m from the banked campfire and the fire is lit.

- **Base policy.** `activeStimuli` lists the campfire as `burning`, salience 2, novel, and nothing is omitted. There are no review deadlines.
- **Test policy** (review every 10 s, limit 1). At t = 2 the next review is at 10. At t = 11 one review has completed and the next is at 20. The simulation clock drives this; a paused world does not advance it.
- **No records.** Ada gained no awareness records about the fire over those 11 seconds.
- **Removal.** After the fire goes out, the next derivation is empty.

A server-level due-review opportunity under the test policy is part of the pending server rerun. The recall ranking change only orders optional candidates; no provider-backed attention was run.

## Dense first exposure (stage 8, PF12.3/PF12.4/SW08.4a)

These runs overlapped a host load average of 295–370 on 10 CPUs. Wall-clock times are unusable; CPU time and counts are reported as indications only. The new scenario files make the dense cases reproducible:

- `scripts/performance/scenarios/dense-first-exposure.json`: 98 people, 50 animals, 500 objects, crowded, 5 steps. Earlier reports used the same populations.
- `scripts/performance/scenarios/crowd.json`: 50 people, 100 animals, crowded, 30 warm-up steps and 180 measured. This reconstructs the earlier 164-entity crowd run; its layout was not recorded then.

| Run                    |           CPU ms | Events / awareness | Digests                                                                |
| ---------------------- | ---------------: | -----------------: | ---------------------------------------------------------------------- |
| Dense, `be68b1e0`      |            1,589 |    10,047 / 19,811 | trace `69911e2a…`                                                      |
| Dense, after stage 7   |            1,651 |               same | same trace; final/awareness differ only by the stage-4 sighting marker |
| Dense, after stage 8   |            1,491 |               same | identical to after stage 7                                             |
| Seed-73, after stage 8 | 2,228 (load 320) |          133 / 353 | final `4a0345f5…` as after stage 4; trace `68be3cdd…` as `be68b1e0`    |

### First-sight burst

On an 870-entity first step, 98 observers record about 9,900 genuine private sightings. Each goes through the full event owner.

- Sightings are evidence the contract requires, so none are dropped or coalesced.
- Stage 8 removes overhead per recorded sighting:
  - skips keying events for obligation completion when no obligation awaits one (about 14 µs per event);
  - freezes appended records without allocating a pair per key;
  - copies each event origin without walking a live draft.
- On the dense profile these took `recordEvent`'s children from about 390 ms (commitments, append freezing) plus about 220 ms of proxy traps down to about 80 ms.
- About 650 ms of garbage collection and status-effect reconciliation remain large in this burst.

### Steady crowd (candidate only)

The crowd is 276 entities after population.

- **Counts:** 1,664 observer rescans versus 7,748 reused exposures. Rescans returned 273,468 candidates; 251,056 sight tests hit the cache and 6,916 were exact.
- **Profile shares:**
  - Immer finalization ~23%;
  - status-effect integration and reconciliation ~29% (time owner);
  - encounter phase ~19%, of which per-root capture of changed actors is ~21% and sight predicates ~14%.

### Decisions

- **PF12.3 target-only rescans: not implemented.** The sight cache already absorbs 97% of the tests a rescan performs. Patching visible lists from changed sources would save at most part of that ~14% slice, while adding an ordering proof for every episode and visible list. It stays open until a profile shows rescans dominating.
- **PF12.4 acoustic reuse: not attempted.** This task changed no hearing code, and the crowd produced one audience scan. Dense hearing qualification remains open.
- **SW08.4a: not accepted.** The measurements above are the concentrated first-exposure evidence. Neither dense case reaches its requested speed on this host, and the burst's cost is genuine private evidence plus native finalization.

## PF08 — flat resident entity map (stage 9)

This microbenchmark is ad hoc, not committed. It uses the real domain draft owner (`draftWorld` → one root's position write → `finishWorld` → `freezeWorld`) on the base world plus N synthetic ground stones. Figures are medians per transition at a host load average of 626–680. Absolute values are inflated; the scaling and the freeze reduction are what matter.

| Entities | Copy + write ms | Finalize ms | Freeze ms before | Freeze ms after write-set freeze |
| -------: | --------------: | ----------: | ---------------: | -------------------------------: |
|      400 |            0.10 |        0.29 |            0.062 |                            0.011 |
|    4,000 |             5.3 |         9.3 |             2.05 |                            0.062 |
|   40,000 |              90 |         205 |             32.2 |                             0.61 |

A separate plain-Node check froze a fresh copy of a 40,000-key frozen map in 0.5 ms, versus 18.4 ms for walking every key. The walk, not `Object.freeze`, was the O(N) freeze cost.

**Implemented (API- and save-preserving).** `finishWorld` records when a transition's predecessor entity map was deep-frozen. `freezeWorld` then deep-freezes the root's other fields, the patch write set and the entity copies Immer published. It reads those copies from Immer's draft scope before finishing, which also catches a copy whose writes cancelled out and so left no patch (found by the final review). Otherwise it keeps the full walk. After every step of seed-73 (60 steps) and the dense scenario (5 steps), a deep walk found 0 unfrozen reachable objects. JSON digests cannot change because freezing does not alter data.

### Alternatives measured or evaluated

| Option                                                                        | Keeps entity-map API                                      | Touches save/serialization code                                               | Status                                                                                                                                                                        |
| ----------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Freeze only the write set                                                     | Yes                                                       | No                                                                            | Implemented                                                                                                                                                                   |
| Remove nested drafts when a plan step starts a command inside the native loop | Yes                                                       | No                                                                            | Not implemented. Kernel/native-loop code co-owned by the time and actions agents, with event-order and rollback risk. Also restores exact write-set lineage after such steps. |
| Let root/retired/spatial caches trust unfrozen published maps                 | Yes                                                       | No                                                                            | Not implemented. The measured win only appears after nested command transitions (the row above).                                                                              |
| `Map` or a `Proxy` facade                                                     | No, or JSON/structured-clone breaks                       | Yes                                                                           | Rejected. Immer copies a `Map` in O(N) too.                                                                                                                                   |
| Two-level sharded entity records                                              | No: about 480 access sites and the patch-path write set   | Yes: persistence ordinals, `world-records`, `game-saves`, `history-residency` | Design only                                                                                                                                                                   |
| Separate contained/attached lots from roots and actors                        | No (`objects.ts`, `getOwn(world.entities, itemId)` users) | Yes: the `sim_entities`/placement schema                                      | Design only                                                                                                                                                                   |

**What still scales with N.** Immer's copy of the map on first write and its finalization over every key of the copy dominate at large N (about 90 ms and 205 ms at 40,000 here). Only sharding or separating lots changes that scaling, and both require the save owner's schema work.

### Rerun after review fixes

This is the same ad-hoc scenario. The fixture helper's fixed 5-second `CREATE DATABASE` timeout kept expiring at load 480–750, so this run used a uniquely named disposable database that I created directly and dropped afterwards. Zero budget and no provider calls, as before.

| Check                                         | Result                                                                                                                                                                                        |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arrival for a previously blind observer       | The player was first moved out of everyone's view, then beside the farthest character. That character did not see the player before; afterwards its intake ticket carried an `exposure` cause |
| Goal change                                   | A creator goal edit produced one admitted opportunity for that character. It was labelled "New experience" because earlier failed attempts had left its evidence unconsumed                   |
| Due stimulus review (test policy, every 10 s) | With a lit fire beside a character, the fire was an active stimulus, and one review opportunity was admitted after 12 s of simulation time                                                    |
| Earlier checks                                | Fair order, cursor, speech ownership, sleep deferral and newcomer results are unchanged                                                                                                       |
| Intake outcomes                               | 81 inspections, 0 failed. 44 admitted, 1 deferred, 36 unchanged; 1,167 evidence records read; longest wait of inspectable work 7 s                                                            |
| Creator health 0 through the server           | `savePersonEditor` returned `person-saved`, Ada died, a `death` event was recorded and there was no storage error. Before the fix, the commit declared events unchanged and paused the world  |

## Mid-point review

A 29-agent adversarial review of stages 2–6 confirmed 22 findings (1 high, 7 medium, 14 low) and rejected 2. The "Fix mid-point review findings" commit fixed or documented each confirmed finding:

- **Fixed in code:**
  - the creator person-save commit mode (high);
  - departures kept out of story introductions;
  - due deadlines age;
  - sequence-based urgency hints that verification reads do not consume;
  - queue-age metrics limited to inspectable work;
  - outcome, evidence-read and exposure-detail counters;
  - protected-importance records kept ahead of trigger truncation;
  - outward-change records no longer re-arm departures;
  - a clear message for out-of-range importance.
- **Documented as limits** ([CG10](../limits/cognition.md#cg10), except the reservoir item, which is in the [EPR04 note](../maintainers/events-perception-and-reactions.md#epr04--private-internal-threshold-events-and-native-protection)):
  - the 30-second linger counts from the window's first recorded departure;
  - linger does not see perception losses shorter than 30 seconds;
  - recording decisions read only resident awareness;
  - a reservoir concern that begins while the owner cannot notice it is not recorded later.
- **Documentation corrections:** architecture, base-world recognition, EPR00/EPR04 notes and the freeze wording.

## Final review (stages 7–9 and review fixes)

A 22-agent adversarial review confirmed 16 low-severity findings and rejected 2.

**Fixed in code:**

- **Boundary freeze completeness.** An entity changed and changed back within one transition gets a new unfrozen copy from Immer, but no patch, so the write-set freeze skipped it.
  - The freeze now also walks the copies Immer published.
  - A set-then-restore check leaves 0 unfrozen objects, and so do the seed-73 (60 steps) and dense (5 steps) runs.
  - The 40,000-entity freeze measures 0.35 ms.
  - An identity comparison over every entity was measured at about 11 ms, versus 14 ms for the full walk, and rejected.
- **Review key.** It is order-independent and covers every salient source before the cue limit.
- **Review clock.** A source's salient period starts at the observer's latest outward-change record, for example a fire being lit.
- **Review opportunities.** A newly due review names its stimulus ("I am still aware of …", type "Review").
- **Collapsed beings.** The attention candidate text says "It has collapsed and is not moving."
- **Trigger reader.** Trigger-worthy evidence (importance ≥ 6, speech and significant types) is kept ahead of truncation.
- **Intake fields.** The unused intake disposition, `sourceId` and `simDue` fields were removed.

**Corrected in docs:**

- linger wording;
- that bodies affect attention ranking only;
- what uses `activeStimuli`;
- EPR01 metadata and editor notes;
- the AG07 seam signature;
- CPU context wording;
- reproduction paths;
- the directed-speech comment and plan text.

## Final matched seed-73 comparison (branch head)

These runs alternate `be68b1e0` and the branch head on `mixed.json`, three pairs, at host load 298–308.

| Pair | `be68b1e0` CPU ms | Head CPU ms | `be68b1e0` p50 / p95 ms | Head p50 / p95 ms | Head headroom at 3× |
| ---- | ----------------: | ----------: | ----------------------: | ----------------: | ------------------: |
| 1    |             2,264 |       1,826 |           11.39 / 74.40 |     10.77 / 43.08 |                0.30 |
| 2    |             2,098 |       1,694 |            9.96 / 19.38 |      7.85 / 15.78 |                0.58 |
| 3    |             1,999 |       1,668 |            9.27 / 15.15 |      7.42 / 17.83 |                0.58 |

- **CPU:** median 2,098 → 1,694 ms, about 19% less. Median step p50 9.96 → 7.85 ms.
- **Tail latency:** the head's p95 was lower in pairs 1 and 2 and higher in pair 3. Tail latency on this host remains unresolved.
- **Outcomes:** every head run has final digest `4a0345f5…`, the stage-4 outcome with sighting `change` markers. Its per-step trace equals `be68b1e0`'s (`68be3cdd…`).
- **Not accepted:** 3× is not reached on this shared host.

## PW08 bounded sight work — October 2, 2026

Engineer 1 implemented the three reductions in the [PW08 brief](../projects/parallel-batch-01-playable-week/simulation-performance.md) after the owner's explicit implementation authorization. A character now changes only sighting bindings that actually arrive or leave; invalidating one body visits only its cached pairs; rebuilding a shared mechanical forecast retains certain pairs only after checking their remaining movement and current sensing dependencies. This evidence establishes reduced selected work and corresponding-baseline semantic equivalence. It does **not** establish faster end-to-end execution, regression-free tails, complete reload equivalence or server capacity. [PW08/PW06](../maintainers/parallel-batch-01-playable-week.md) and their broader parents retain their unmet acceptance.

### Revisions, host and reproduction

The actual starting base was the inherited planning commit **`8005f7c7245cfecec128652efe3ef07926604e0a`**, not the historical `6664144a` inspection base or a branch without the planning documents. The baseline was a private `git archive` copy at `/private/tmp/openlegend-pw08-baseline-wdsf3tij`, with production behavior unchanged and observational hooks added for the selected counts. Its original-code/instrumentation diffs are retained privately. The first reviewed candidate was the `oct2-eng-1` working tree, captured at HEAD `d1fa27ab630773857e00ec7e1e2f8cc5375ab5f5` with the PW08 implementation still uncommitted, then preserved in **`b5667c0c0acbb19a6aec825f7e7f7ea810f7d698`**. The scenario support had already been published as `fe85785b`. The final copied-value follow-up is identified below. This is branch evidence before the whole-week integration matrix.

All native measurements below used `/Users/mzw/.nvm/versions/node/v22.23.2/bin/node`, the locked TS/tsx dependencies, frozen snapshots and equivalent CPU profiling, tracing and counter instrumentation. Baseline and candidate used byte-identical scenario/native-runner files. Resolving `@open-legend/domain` and `@open-legend/spatial` from the baseline printed paths inside the archive, confirming that shared third-party dependency links did not execute candidate workspace modules. No paid provider call was made.

Host: Apple M1 Pro, 10 CPU cores, arm64, macOS 15.7.3/Darwin 24.6.0. During the first reviewed sequence a host snapshot read load averages **158.51 / 149.98 / 137.56**. This was one snapshot, not per-run load sampling. Other engineering and PostgreSQL profiling continued; these results are shared-host attribution evidence, not a quiet-host qualification or a release soak.

Raw manifests, initial fixture, reports, traces, CPU profiles, source hashes, comparison details and the operational semantic script remain outside Git at `/private/tmp/openlegend-pw08-evidence`. The first reviewed measurements use `reviewed-{baseline,candidate}-{dense,dense-static,near,separated}-{1,2,3}` outputs; final follow-up outputs use `read-reuse-*` as identified below. Earlier unpinned Node runs, pre-review timings and the earlier added-static digest disagreement caused by changing the hash implementation between launches are discarded. That disagreement is not treated as a passing reproduction.

The first reviewed runtime/harness SHA-256 values are recorded here so a later branch commit cannot silently change which implementation was measured:

```text
kernel.ts             327538406631b803babd98c863342712953cdc9a2e0b08b70059adbbfa23eb12
motion-boundaries.ts  0e178b2b3836dadeaf205e9509ac407be04b5e04816f826eafc2d1b415df1e15
perception.ts         e9e30e7396a3b170efa38125e7cf2183af6afb7ae4e6446c9018eca1c0a35076
diagnostic-counters.ts c6c9dd7ed14e46d16a2d51e1f1b0112c2170e146ab4f0ad9453e74d5fd31b035
profile-native.ts     ffce89bc0ae53355837e14c509b4bfc4515cd675e74bf400570300d6be939ee9
scenario.ts           b52d20f244972ed4f8121394be7eb3c3ad09ffa961baf2a0abddb22fdb445f9b
stress-native.ts      0079a15f1ced5e5452487a47e1a9892b32a2e3dcb4418982f95294035ba53cf8
```

The archive's counter hooks observe the original full sighting-map reconstruction and full pair scan; they do not apply the candidate's reductions. Each final pair ran baseline then candidate before the next repetition. The private `run-reviewed.py` script executes the following command pattern with unique paths, three times for each of the four manifests:

```sh
git archive 8005f7c7245cfecec128652efe3ef07926604e0a | tar -x -C /private/tmp/NEW-pw08-baseline

# From the selected baseline/candidate directory, with matched observational tooling:
AI_BUDGET_USD=0 OPENLEGEND_PROFILE_TRACE=/private/tmp/NEW-trace.json \
  /Users/mzw/.nvm/versions/node/v22.23.2/bin/node --import tsx \
  scripts/stress-native.ts /private/tmp/openlegend-pw08-evidence/dense.json \
  /private/tmp/NEW.cpuprofile > /private/tmp/NEW.json

# Run once from each source directory; output paths must be new:
AI_BUDGET_USD=0 /Users/mzw/.nvm/versions/node/v22.23.2/bin/node --import tsx \
  /private/tmp/openlegend-pw08-evidence/semantic.mts "$PWD" /private/tmp/NEW-semantic.json

AI_BUDGET_USD=0 pnpm exec vitest run packages/domain/src/perception.test.ts \
  packages/domain/src/kernel.test.ts packages/domain/src/spatial-world.test.ts
pnpm typecheck
```

The detailed static comparison used `OPENLEGEND_PROFILE_DETAIL=1` with the same native command to write `{trace,world}` after the timed loop. CPU attribution reads each private `.cpuprofile` and sums sample time whose call ancestry contains the listed owners; it makes no provider or database call.

### Exact workload

The dense input manifest was:

```json
{
  "seed": 73,
  "people": 60,
  "animals": 100,
  "birds": 48,
  "mapSize": 96,
  "layout": "crowded",
  "steps": 100000,
  "warmupSeconds": 60,
  "durationSeconds": 300,
  "intervalSeconds": 30,
  "maxIntervals": 4096,
  "timeoutSeconds": 600,
  "objects": [{ "count": 500, "name": "Synthetic static root", "properties": ["rigid"] }]
}
```

The default requested speed is 1×. The duration fields select actual game-time warmup/measurement rather than the legacy step-count limit: two 30-second warmup calls and ten 30-second measured offers all complete. Setup, collision initialization, initial freezing and first exposure are outside the measured span. All final runs advance the full **60 warmup + 300 measured game seconds**; no timeout or short progress is reported as throughput.

People and deer use the existing native spawn owners. Static objects have quantity 1, work 1 and the fixture-only rigid definition, not one object containing a stack of 500. Crowded positions use the existing placement generator around the player. Added birds copy the native starter bird body and follow rectangular loops with 12-metre sides, speed 0.6 m/s, climb speed 0.3 m/s, altitude `5 + (index % 4) * 0.1`, starting X offset `(index % 6) * 0.5`, Z offset `floor(index / 6) * 0.5`, and initial waits `(index * 7) % 53` seconds. Route waypoints have no waits. The initial private fixture records all resolved definitions and exact positions/routes.

| Manifest       | Changes from dense                                                                 | Stored entities / world roots | Living actors with memory capability / flight bodies | Map       |
| -------------- | ---------------------------------------------------------------------------------- | ----------------------------: | ---------------------------------------------------: | --------- |
| `dense`        | As above                                                                           |                     861 / 723 |                                              63 / 49 | 96 × 96   |
| `dense-static` | Static count 1,000                                                                 |                 1,361 / 1,223 |                                              63 / 49 | 96 × 96   |
| `near`         | 10 people, 20 deer, 8 birds, 100 static objects; map 192                           |                     191 / 153 |                                               13 / 9 | 192 × 192 |
| `separated`    | `near` plus `groupDistance: 80`, duplicating added content 80 metres along X and Z |                     349 / 291 |                                              23 / 17 | 192 × 192 |

The far group and its full flight envelope remain outside near sense ranges. Separated/scattered placement is rejected because shuffling the entire map would not guarantee separation. Bird fixtures require the native starter bird body and reject a route that cannot fit on the selected map. These fixture bounds change no gameplay population limit.

### Three reviewed repetitions before copied-value reuse

All durations are milliseconds. Each measured run contains ten calls, so the reported p95 equals the maximum call. These are longest synchronous native calls, not a server no-yield measurement.

| Workload     | Pair | Baseline CPU / wall | Candidate CPU / wall |    Baseline p50 / p95 / max |   Candidate p50 / p95 / max |
| ------------ | ---: | ------------------: | -------------------: | --------------------------: | --------------------------: |
| dense        |    1 | 17,202.2 / 17,452.9 |  17,897.0 / 19,928.0 | 1,696.5 / 2,715.3 / 2,715.3 | 1,757.7 / 3,338.4 / 3,338.4 |
| dense        |    2 | 17,311.8 / 17,977.5 |  18,500.6 / 21,385.8 | 1,660.0 / 2,769.0 / 2,769.0 | 1,922.8 / 3,855.8 / 3,855.8 |
| dense        |    3 | 17,566.9 / 19,402.8 |  19,258.7 / 21,205.8 | 1,819.4 / 3,033.7 / 3,033.7 | 1,896.2 / 3,457.0 / 3,457.0 |
| dense-static |    1 | 18,555.1 / 20,306.8 |  19,221.6 / 20,742.3 | 1,814.5 / 3,462.4 / 3,462.4 | 1,921.1 / 3,510.4 / 3,510.4 |
| dense-static |    2 | 18,395.1 / 20,542.3 |  18,015.4 / 18,784.0 | 1,982.5 / 3,549.9 / 3,549.9 | 1,694.2 / 2,908.0 / 2,908.0 |
| dense-static |    3 | 18,895.8 / 19,888.9 |  18,960.0 / 19,612.7 | 1,793.8 / 3,512.7 / 3,512.7 | 1,795.9 / 3,407.7 / 3,407.7 |
| near         |    1 |   2,742.8 / 2,396.1 |    2,774.4 / 2,434.3 |       237.2 / 311.5 / 311.5 |       237.3 / 306.2 / 306.2 |
| near         |    2 |   2,800.2 / 2,550.8 |    2,816.5 / 2,534.6 |       237.6 / 358.8 / 358.8 |       247.9 / 308.2 / 308.2 |
| near         |    3 |   2,927.5 / 2,786.8 |    2,816.2 / 2,542.3 |       258.2 / 333.0 / 333.0 |       242.6 / 353.4 / 353.4 |
| separated    |    1 |   5,055.1 / 4,877.3 |    5,344.9 / 5,317.6 |       492.5 / 563.9 / 563.9 |       471.4 / 856.0 / 856.0 |
| separated    |    2 |   5,124.1 / 4,985.5 |    5,169.2 / 4,904.4 |       464.8 / 644.7 / 644.7 |       476.3 / 587.1 / 587.1 |
| separated    |    3 |   5,107.9 / 4,851.5 |    5,175.3 / 5,416.8 |       460.3 / 640.0 / 640.0 |       496.9 / 738.4 / 738.4 |

Median CPU changes are dense **+6.9%**, added-static **+2.2%**, near **+0.6%**, separated **+1.3%**. Dense candidate tails are higher in all three first-reviewed pairs. The selected operation counts below fall, but CPU/tail performance acceptance remains unestablished; no end-to-end speedup is claimed.

### Attributable work, memory and remaining costs

Counts are identical across all three repetitions of each side and remain identical in the final dense/static follow-up. Baseline invalidation counts every pair visited in its full scans; candidate invalidation counts deduplicated incident keys. Candidate pruning counts the separate global eligibility/expiry scan, so it is reported rather than hidden in the incident reduction.

| Measured work                                         | Dense baseline → candidate | Added-static baseline → candidate | Near baseline → candidate | Separated baseline → candidate |
| ----------------------------------------------------- | -------------------------: | --------------------------------: | ------------------------: | -----------------------------: |
| Sighting bindings assigned                            |                37,430 → 47 |                       63,430 → 47 |                1,520 → 10 |                     1,520 → 10 |
| Actual additions / deletions                          |            47 / 5 → 47 / 5 |                   47 / 5 → 47 / 5 |           10 / 0 → 10 / 0 |                10 / 0 → 10 / 0 |
| Exact sight/contact pair evaluations                  |            21,483 → 15,624 |                   21,483 → 15,624 |                 793 → 585 |                    1,353 → 995 |
| Pair cache hits                                       |          544,950 → 550,809 |                 544,950 → 550,809 |           19,773 → 19,981 |                33,933 → 34,291 |
| Invalidation keys visited                             |           151,263 → 15,561 |                  151,263 → 15,561 |               1,170 → 546 |                    3,714 → 936 |
| Candidate pruning visits / retained pair observations |            15,309 / 15,309 |                   15,309 / 15,309 |                 546 / 520 |                      946 / 900 |
| Candidate expired pair misses                         |                          0 |                                 0 |                        26 |                             46 |
| Peak pair records / tracks, both sides                |                3,087 / 112 |                       3,087 / 112 |                  117 / 22 |                       197 / 40 |
| Root scans / roots visited, both sides                |              207 / 149,661 |                     207 / 253,161 |              206 / 31,518 |                   206 / 59,946 |
| Spatial builds / queries / candidates, both sides     |   558 / 35,092 / 4,242,546 |          558 / 35,092 / 4,242,546 |     555 / 7,203 / 171,002 |         555 / 12,743 / 286,096 |
| Observer passes / ordinary sight tests, both sides    |           11,718 / 578,340 |                  11,718 / 578,340 |            2,405 / 21,099 |                 4,255 / 36,136 |
| New recorded events / awareness writes, both sides    |                     1 / 26 |                            1 / 26 |                     1 / 3 |                          1 / 3 |

Dense exact pair work falls **27.3%** and incident invalidation visits fall **89.7%**, with separate pruning still required. Every live pair has exactly two reverse memberships. The dense workload has no uncertain-outcome records; source review confirms their conservative clearing at a shared rebuild, so dense timings do not qualify that branch. Retention miss counters record expiry/geometry/eligibility per pair, body/path proof failures per body, and a missing-track path failure per removed pair. The first pruning scan skips certificate reads for expired pairs, derives the remaining horizon for each body and rejects missing tracks; stationary-path comparisons avoid constructing clipped tracks and breakpoint arrays.

The first-reviewed CPU profiles explain a real safety-check tradeoff, not a free optimization. Inclusive sampled wall-time medians for the exact pair solver are **891 → 836 ms**. New certificate/reconciliation/index owners account for **263 ms**; sight-bound calculation plus reconciliation rises **2,999 → 3,897 ms**. These categories overlap and are sampled wall time, not additive exclusive CPU measurements. They expose additional dependency validation and draft reads while unchanged draft/flight/geometry work remains dominant. The measured total CPU and tails still need quiet-host qualification; shared load alone is not proof that their regression is harmless.

Native heap values are unforced, unnormalized garbage-collector observations. The harness samples at measurement start and every 30 completed calls; these ten-call runs therefore contain only a **start sample plus the separately reported end value**, not a captured peak. Start/end ranges over the three runs, in decimal MB:

| Case         | Baseline start / end range   | Candidate start / end range   |
| ------------ | ---------------------------- | ----------------------------- |
| dense        | 105.28–109.52 / 81.51–96.73  | 78.47–98.95 / 107.00–263.42   |
| dense-static | 109.09–112.82 / 80.33–127.08 | 107.30–111.20 / 119.10–131.48 |
| near         | 37.57–46.58 / 53.52–59.90    | 38.02–40.44 / 59.98–61.88     |
| separated    | 49.72–51.27 / 38.70–46.07    | 56.82–58.96 / 38.51–49.95     |

Whole-world root enumeration grows with added static objects; spatial candidate construction and total CPU grow with a far active group. The change does not establish constant-cost publication, full-world locality or completion of proportional-step stages 2–3.

### Corresponding-baseline correctness and cache ownership

Every listed stress pair has equal exact event/outcome traces, ordered audiences, awareness, saved randomness, next-ID/sequence values and simulation progress. Complete world structure compares with native numbers rounded to six decimal places and only sighting-map entry order normalized. Raw JSON hashes differ because continuing bindings keep their insertion order; they are not used alone as correctness evidence. A detailed static comparison before the final allocation simplifications recursively found zero differing values in `{trace,world}`; the final simplified source retains the same semantic and exact evidence digests.

The private operational script exercises normal domain callers and JSON reload; no new automated regression suite was added. Final candidate output is `candidate-semantic-reviewed.json`, compared to `baseline-semantic-complete.json`. All nine authoritative edge rows and all nine crowd rows match their corresponding baseline. Each edge uses 30-second offers, 1-second offers and a whole-span offer; for a 30-second scene the first and whole-span schedules coincide. Outcomes from different offer schedules are not equated.

| Case                         | Setup and demonstrated result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stable visible crowd         | One sensing player, 100/500/1,500 unchanged static roots, Ada leaves for 1 second, returns for 1 second, leaves for 31 seconds, returns for 1 second. For 30-second, 1-second and whole-span offers, baseline assignments 450/2,050/6,050 become 2 actual additions and 2 deletions. Continuing object identities stay unchanged; the short return keeps Ada's subject identity, the long return creates a new one. Corresponding authoritative state/evidence match. Linear membership comparison and changed-map finalization remain. |
| Brief wall slit              | Observer at (12,0,12), fixed walker from (16,0,8) to (16,0,16), two walls at X 14–14.1 leaving a Z 11.9–12.1 slit; 30-second span. The fleeting sight interval is recorded with the same ordered evidence as the corresponding baseline.                                                                                                                                                                                                                                                                                                |
| Physical contact             | Contact-only player walks from (12,0,12) to (16,0,12) past Ada at (14,0,12), native loaded speed 0.11 m/s; 20-second span. The route is admitted through ordinary vision before restoring contact-only sensing. All three candidate schedules detect the same interval and evidence as their baseline.                                                                                                                                                                                                                                  |
| Hover, landing and wait      | Bird starts (14,3,12), travels to (16,3,12), waits 3 seconds, lands at (16,0,12), waits 3 seconds; speed/climb 1, 30-second span. Same movement, transition evidence and final values as each corresponding baseline.                                                                                                                                                                                                                                                                                                                   |
| Certain-pair reuse           | Fixed player route (12,0,12) to (20,0,12) produces 14 certain pairs. An unchanged shared rebuild retains them; the next bound records 14 cache hits without reevaluation. The dense staggered flock independently records 15,309 retained observations.                                                                                                                                                                                                                                                                                 |
| Incident ownership and forks | Disjoint near/far groups: 3 people, 2 deer, 2 birds, 20 static objects per group, map 192 and offset 80. Duplicate invalidation of one near bird visits its six incident keys once; far pair records retain identity. Two forks copy every map/set; removing both ends with one track already missing and repeating invalidation leaves no stale reverse entry. Expiry removes all expired pairs. Editing far-bird participation leaves every nonincident near pair record unchanged.                                                   |
| Changed dependencies         | Same-position route replacement, body-height change, live sense-radius definition change without a revision bump, sensing-capability loss, inactive participation, new map barrier, death and removal each reject the affected pairs. Tests assert exact reverse memberships after each operation. No draft, cache or reverse index is saved.                                                                                                                                                                                           |

**Reload acceptance is only partial.** Rebuilding the derived cache through midpoint JSON reload matches uninterrupted authoritative state for the 1-second contact schedule and all hover/landing/wait schedules. The stronger wall/contact probes reproduce these pre-existing baseline gaps on both sides:

- Wall-slit midpoint reload: evidence, physical values, needs, identities, randomness and next-ID/sequence match, but 18 saved placement/need/work-invocation revision values differ from uninterrupted execution for all three schedules.
- Contact midpoint reload after 10 seconds with 30-second or whole-span offers: the first contact evidence time changes from **18.181819181818184** to **19.090909090909093** seconds, plus saved revision differences. Both paths detect contact; uninterrupted-versus-restored evidence is not exact. Baseline and candidate reproduce the same respective results.

The existing continuation retains a remaining mechanical sampling distance between calls; rebuilding after reload starts a fresh distance forecast. This is a broader time/restore gap, not repaired by the scoped pair retention. It remains an unmet acceptance requirement rather than a newly accepted policy. The passing reload rows prove actual cache reconstruction, not merely repeated calls to the same cached world.

The focused existing `perception`, `kernel` and `spatial-world` checks pass **29 tests in three files**, and `pnpm typecheck` passes after the final source simplifications. Complete `pnpm run check` and combined-week acceptance belong to PW06; these native results alone do not close it. Real PostgreSQL evidence is maintained in the following subsection by the server measurement owner.

### Final source follow-up: reuse copied values within one calculation

Review attributed avoidable cost to rereading current participation, senses and body geometry after those exact values had already been copied for the same sight-bound calculation. The follow-up reuses those invocation-local scalars for moving/observer eligibility and observer/target geometry. It adds no cross-call cache, authority, changed movement horizon or skipped dependency check. Fresh movement derivation, remaining-interval proof and current retrieval guards remain intact. Approximately 35 logic lines change relative to `b5667c0c`; total scoped PW08 runtime/tooling work is approximately 440–480 affected logic lines excluding tests/documentation.

The final source is `b5667c0c` plus `motion-boundaries.ts` SHA-256 **`0648a0a0050713b26f6c602e49f388d5a38416ceb59d6be0c5d3155041cc0794`**. Other runtime/harness hashes above are unchanged. Final private outputs are `read-reuse-{baseline,candidate}-{dense,dense-static}-{1,2,3}`. The same command pattern/manifests were used in three alternating pairs per case. An initially requested one-pair static validation showed +16.9% CPU; two additional focused repetitions investigated that concrete regression. All three remain visible here. The near/separated timing rows above measure the earlier reviewed source; their final-source incident-isolation correctness was rerun directly, without claiming those old timings measure the follow-up.

| Workload     | Pair | Baseline CPU / wall ms | Final candidate CPU / wall ms | Baseline p50 / p95 / max ms | Final candidate p50 / p95 / max ms |
| ------------ | ---: | ---------------------: | ----------------------------: | --------------------------: | ---------------------------------: |
| dense        |    1 |    18,304.1 / 22,916.3 |           17,509.2 / 19,931.6 | 2,126.4 / 3,506.0 / 3,506.0 |        1,831.7 / 2,879.6 / 2,879.6 |
| dense        |    2 |    17,644.1 / 19,203.3 |           19,339.5 / 20,728.7 | 1,716.2 / 3,001.6 / 3,001.6 |        1,785.7 / 3,012.6 / 3,012.6 |
| dense        |    3 |    18,095.9 / 20,477.1 |           18,496.2 / 20,556.5 | 2,052.4 / 3,346.4 / 3,346.4 |        1,877.4 / 2,922.8 / 2,922.8 |
| dense-static |    1 |    19,001.2 / 23,787.5 |           22,207.4 / 27,543.6 | 2,037.7 / 4,462.3 / 4,462.3 |        2,446.7 / 5,245.8 / 5,245.8 |
| dense-static |    2 |    22,305.7 / 27,293.8 |           22,041.1 / 27,024.8 | 2,642.1 / 4,211.7 / 4,211.7 |        2,408.3 / 5,908.8 / 5,908.8 |
| dense-static |    3 |    23,629.1 / 28,329.5 |           22,810.6 / 27,951.4 | 2,811.4 / 4,460.3 / 4,460.3 |        2,688.3 / 4,820.3 / 4,820.3 |

Every final pair again advances all 300 measured game seconds, with exact trace/awareness and normalized full-state equality. Selected counts and cache high-water marks remain exactly those in the table above, including 47 actual dense/static binding assignments and 15,624 exact pair evaluations. This establishes the scoped reductions and conservative reuse on the final source, not a lower total game-time budget or an unfinished-run advantage.

Dense median CPU is **18,095.857 → 18,496.245 ms (+2.2%)**; added-static median is **22,305.671 → 22,207.363 ms (−0.44%)**. Dense tails fall in two pairs and differ by +0.37% in the third. Added-static candidate tails remain higher in all three pairs, with median **4,460.279 → 5,245.792 ms (+17.6%)**. The repeated-read overhead has been addressed, but this does not establish harmless tails or an end-to-end speedup. The brief's regression-free performance acceptance remains unresolved.

Final dense inclusive sampled wall-time medians: exact pair solver **987.197 → 776.429 ms**, new guards/reconciliation/index **225.504 ms**, sight-bound calculation plus reconciliation **3,472.842 → 2,863.711 ms**. This reverses the earlier measured +898 ms in that owner to −609 ms; the total CPU remains dominated by other existing work and host/run variation. In the first final static pair, the same owner decreases **3,902.587 → 3,820.551 ms**, despite +3,206 ms total CPU. Further static repeats yield total CPU changes +16.9%/−1.2%/−3.5%; these samples do not attribute the persistent worst-call increase completely. Profiler sample gaps are compatible with descheduling but do not prove that the latency difference is harmless. Full target construction, draft/finalization cost and quiet-host qualification remain parent work; no further proof-cache or scheduler expansion was made.

The final independent review also attributes both remaining static pairs: sight-bound calculation plus reconciliation falls **4,455.407 → 3,852.089 ms** and **4,862.655 → 3,928.669 ms**; exact pair solving falls in all three pairs. Garbage-collection time and large sample gaps do not increase consistently. The retained profiles lack per-call timestamp boundaries, so those aggregate reductions cannot explain the individual longest calls. No concrete introduced cause is established and no latency pass is inferred; quiet-host measurements with per-call attribution remain meaningful qualification.

Final native start/end heap observations (decimal MB, not peaks) are dense baseline **107.50–110.10 / 78.81–96.49**, candidate **79.74–101.83 / 104.04–265.18**; added-static baseline **104.43–111.12 / 67.90–89.31**, candidate **110.33–122.16 / 120.72–135.45**. During/after this follow-up host snapshots read **165.83 / 159.04 / 156.69** and **133.37 / 141.04 / 149.00**; they are not per-run sampling.

The final private `semantic-read-reuse.mts` script passes the same nine authoritative edge rows and nine crowd rows against the planning-base report, plus **12** cache rows. Two added direct probes confirm that reconciliation removes pairs whose track was independently missing, and that an actual uncertain landing produces two outcome memo records which are cleared at shared rebuild and reevaluated on the next bound. All reverse memberships remain exact. The focused **29 tests**, typecheck and pinned formatting check pass again. The stronger reload gaps above remain unchanged and required, not waived by corresponding-baseline equivalence.

### Real PostgreSQL server — final read-reuse candidate

The same dense manifest above ran through the real server timer, durable HTTP move/cancel commands, state reads and SSE. Each run created and removed its own PostgreSQL 14.17/pgvector database and temporary data directory, using an ephemeral HTTP port. The server keys were cleared and its provider budget was zero: **additional provider/Jev cost $0; cumulative cost for this delegated pricing/profiling scope $0**. This is neither browser nor live-provider acceptance.

The baseline remains the inherited planning commit `8005f7c7245cfecec128652efe3ef07926604e0a` archive. The measured candidate source was published as `b9b8124bf7aae26b8fb6e54e9ee0b93d2c09583b`, including the same-call scalar-read reuse in `motion-boundaries.ts`, SHA256 `0648a0a0050713b26f6c602e49f388d5a38416ceb59d6be0c5d3155041cc0794`. Runtime stayed frozen throughout each candidate sequence. These measurements precede the later body/response/memory integration; they do not qualify that combined runtime. The profiler and observational server timing were published as `460f4cae`; baseline and candidate used byte-identical profiler, scenario and server-timing files. Both used the absolute Node v22.23.2 executable shown in the native reproduction commands. The baseline used development database/save marker 2 and the candidate marker 3 after `d1fa27ab`; each bootstrapped and reopened only its own compatible fresh database. No legacy import or benchmark-input conversion occurred; this marker change does not change physical tables or the authored scene.

The fixed warm interval is **60 real seconds**, followed by **15 real seconds of offered client load**, with response drain included in reported elapsed time. This differs from the native runner's 60/300 **game-second** spans. The client continuously offered commands every 500 ms, state reads every 250 ms and presence heartbeats every three seconds. Warmup and measurement shared one child process and timer; an ordinary pause between them failed busy admission in an earlier retained diagnostic. The restarted fixture took control through the normal embodiment endpoint before play. Requests are assigned by their start timestamp; two command/read requests cross the warm cutoff in every final run. Server duration samples belong to the phase in which the operation finishes, so a crossing operation can include earlier work. Final shutdown stops only the fixture's own timer and drains its work.

The original baseline/candidate 1×, 3×, 8× sequence alternated six fresh fixtures. After the final scalar-read simplification, only the three candidate fixtures were repeated; the unchanged baseline records were reused with their actual host load disclosed. These are shared-host samples with concurrent native profiling, not quiet-host or steady-state qualification. Exact reports/provenance are private at `/private/tmp/openlegend-pw08-evidence/final-server-summary.json` and `final-read-reuse-server-provenance.json`; final inputs are `reviewed-warm60-baseline-server-dense-{1,3,8}x.json` and `final-read-reuse-candidate-server-dense-{1,3,8}x.json`.

The actual command pattern, from the selected source directory with `OPEN_LEGEND_PROFILE_POSTGRES_URL` explicitly set to the loopback fixture administrator, was:

```sh
OPENLEGEND_PROFILE_SERVER_WARMUP_SECONDS=60 AI_BUDGET_USD=0 \
  /Users/mzw/.nvm/versions/node/v22.23.2/bin/node --import tsx \
  scripts/performance/profile-server.mjs /private/tmp/openlegend-pw08-evidence/dense.json \
  /private/tmp/NEW-server-report.json 15 1 500
```

The final argument sequence was also `15 3 500` and `15 8 500`, with unique report paths. Setup/collision initialization and scene construction are outside these intervals. Every final fixture contains 861 entities. The warm interval records startup and any earlier failures rather than erasing them:

| Requested speed | Revision  | Warm elapsed, real s | Warm advanced, game s | Warm admitted, game s | Warm ending debt, game s | Warm failed requests |
| --------------- | --------- | -------------------: | --------------------: | --------------------: | -----------------------: | -------------------: |
| 1×              | Baseline  |               60.042 |                82.970 |               303.892 |                  217.885 |                    3 |
| 1×              | Candidate |               60.032 |                85.636 |               256.372 |                  167.704 |                    4 |
| 3×              | Baseline  |               60.023 |               129.697 |               914.827 |                  785.130 |                    1 |
| 3×              | Candidate |               60.116 |                47.000 |               912.235 |                  856.072 |                    4 |
| 8×              | Baseline  |               60.012 |               115.061 |             1,832.344 |                1,693.198 |                    2 |
| 8×              | Candidate |               60.023 |                87.182 |             1,438.216 |                1,324.466 |                    4 |

The normal bundled-world rate is 60 game seconds per real second. Nominal demand below is elapsed wall time × that rate × requested speed; it is not a claim that this time was admitted. Debt means game time already admitted but not yet advanced. In every measured phase the running clock operation continued consuming warm debt, with **zero newly admitted game time**. Warm ending debt minus measured advancement equals measured ending debt. Timer callbacks remained visible and recorded skipped-while-busy counts; further elapsed wall time had not yet entered the clock operation. Presence failures and the current suspension/pause policy remain visible limits, not continuous-presence acceptance.

| Requested speed | Revision  | Measured elapsed, real s | Nominal game demand, s | Newly admitted, game s | Actually advanced, game s | Ending debt, game s |
| --------------- | --------- | -----------------------: | ---------------------: | ---------------------: | ------------------------: | ------------------: |
| 1×              | Baseline  |                   15.837 |                950.210 |                      0 |                    47.727 |             170.157 |
| 1×              | Candidate |                   16.027 |                961.643 |                      0 |                    31.515 |             136.189 |
| 3×              | Baseline  |                   15.870 |              2,856.686 |                      0 |                    46.061 |             739.070 |
| 3×              | Candidate |                   15.883 |              2,858.854 |                      0 |                    37.970 |             818.103 |
| 8×              | Baseline  |                   16.350 |              7,848.001 |                      0 |                    46.061 |           1,647.137 |
| 8×              | Candidate |                   16.093 |              7,724.532 |                      0 |                    31.970 |           1,292.497 |

CPU below is the whole server process. The longest indivisible native call is one iterator call; the no-yield span is contiguous synchronous native work between actual yields, including final freeze. It excludes mutation-queue waits, PostgreSQL/storage waits and cooperative waiting, but includes host descheduling. Native-step maxima additionally include cooperative waits and were baseline/candidate **427.953/1,043.267**, **807.918/658.917**, **574.429/580.757 ms** at 1×/3×/8×. Final-freeze maxima were **0.696/2.812**, **0.976/6.022**, **1.294/1.386 ms**. The existing roughly-eight-millisecond scheduling threshold is unchanged; indivisible operations can exceed it.

| Speed | Revision  | Server CPU, ms | Longest native call, ms | Longest no-yield span, ms | Accepted commands |           Ack p50 / p95 / max, ms | Skipped client intervals |
| ----- | --------- | -------------: | ----------------------: | ------------------------: | ----------------: | --------------------------------: | -----------------------: |
| 1×    | Baseline  |     11,943.161 |                 302.227 |                   304.499 |                15 | 1,043.628 / 2,094.241 / 2,094.241 |                       22 |
| 1×    | Candidate |      8,985.390 |                 720.898 |                   726.784 |                11 | 1,132.224 / 2,967.258 / 2,967.258 |                       31 |
| 3×    | Baseline  |     11,313.943 |                 511.668 |                   511.744 |                14 |   942.444 / 2,273.567 / 2,273.567 |                       26 |
| 3×    | Candidate |     10,984.493 |                 382.913 |                   385.005 |                13 | 1,010.555 / 2,259.888 / 2,259.888 |                       34 |
| 8×    | Baseline  |     11,902.183 |                 440.852 |                   443.875 |                14 | 1,030.188 / 1,647.244 / 1,647.244 |                       24 |
| 8×    | Candidate |      8,808.307 |                 383.928 |                   390.900 |                10 | 1,115.034 / 3,347.666 / 3,347.666 |                       33 |

Successful command counts include accepted moves and cancels. All final measured phases have zero rejected commands and zero request errors; skipped intervals combine the three bounded client lanes and are not successful offers. Each run still exits unsuccessfully because its warm phase contains failed presence heartbeats; baseline 1× and all final candidates also contain a warm request timeout. No transport retry or busy-gate bypass occurred. Storage error and memory backlog stayed null; all owned cleanup succeeded. State-read p95 baseline/candidate was **653.938/731.408**, **597.948/792.328**, **630.239/729.627 ms**. Event-loop p95/max was **111.280/348.127 vs 102.302/748.683**, **114.557/512.229 vs 124.715/412.353**, **113.246/475.791 vs 101.384/424.149 ms**.

The following are maximum stage durations, not additive CPU costs. Database statements, save transactions, queue waiting and permitted-view projection overlap. Their raw total durations/counts remain in the reports. Memory values are unforced phase-start/end samples in decimal MB, not peaks or leak certification. RSS covers resident memory across process threads; heap describes the main JavaScript isolate.

| Speed | Revision  | SQL statement max, ms | Save transaction max, ms | Mutation wait max, ms | Projection max, ms | Heap start / end, MB | RSS start / end, MB | One-minute host load start / end |
| ----- | --------- | --------------------: | -----------------------: | --------------------: | -----------------: | -------------------: | ------------------: | -------------------------------: |
| 1×    | Baseline  |               764.035 |                1,431.760 |             1,551.722 |            134.014 |    261.027 / 286.039 |   384.827 / 469.697 |                171.322 / 161.025 |
| 1×    | Candidate |             1,011.255 |                2,370.856 |             2,580.620 |            153.510 |    193.022 / 124.545 |   316.899 / 292.880 |                170.326 / 163.164 |
| 3×    | Baseline  |               746.198 |                1,348.770 |             1,746.531 |            153.965 |    157.847 / 325.407 |   560.218 / 474.563 |                180.337 / 182.033 |
| 3×    | Candidate |               977.988 |                1,153.338 |             1,640.824 |            320.161 |    180.794 / 128.493 |   375.538 / 452.100 |                126.630 / 129.855 |
| 8×    | Baseline  |               458.713 |                  856.530 |             1,034.130 |            141.587 |    339.808 / 218.262 |   491.356 / 529.547 |                170.496 / 162.895 |
| 8×    | Candidate |               758.789 |                1,962.088 |             2,495.394 |            153.653 |    111.104 / 327.459 |   302.547 / 324.026 |                136.445 / 136.328 |

**Capacity remains failed at every requested speed.** The candidate advances less game time in all three final server samples; its 1× no-yield maximum and 1×/8× command tails are worse. Lower total CPU while advancing less game time is not a speedup. Different starting game times, evolving command/history work and host contention prevent these short wall-timed cases from isolating a native cause. The matched fixed-game-span native comparison above establishes the selected work reduction and examines its CPU tradeoff; neither comparison closes full-server throughput, responsiveness, steady-state, browser, multiple-player or long-soak gates. Existing performance budgets remain unchanged.

Earlier evidence is retained separately: the missing-collision initialization run; busy pause between warmup and measurement; invalid command-control binding; mixed Node versions; five-second and thirty-second warmups with cold operations crossing measurement; the pre-simplification six-run set; and the reviewed pre-read-reuse six-run set. In particular, one reviewed 30-second baseline reports a cold save transaction lasting **32.059 seconds**, finishing during measurement. These records are neither erased nor used as the final warm comparison.

### Independent review follow-through

The owner then requested code review, justified improvements and completion of independent work, while stopping all task messaging and reserving peer integration for a separate pass. This pass starts from `ec995ae4a70ad385a709520992de640eae097f13` on unchanged `oct2-eng-1`; the inherited planning base remains `8005f7c7245cfecec128652efe3ef07926604e0a`. No peer branch was read, integrated or edited. Earlier temporary artifacts were no longer present at their recorded paths; their published measurements remain historical. This pass creates fresh private artifacts at `/private/tmp/openlegend-eng1-review.afva0h`.

**Restoration repair.** Inspection confirmed that the time remaining until the next mechanical sampling boundary existed only in a private continuation. Losing it could move contact evidence from 18.181819181818184 to 19.090909090909093 game seconds, even though all rates and sight calculations were correctly rebuilt. The accepted narrow repair saves the remainder and optional exact deadline through existing world settings. Load rederives current bounds and uses the earlier end; semantic mutation discards inherited progress, native advance publishes a new remainder, and no-op validation/pause/resume preserve it. Derived participants, rates, motion tracks, reverse lookups and sight/contact runs remain unsaved. Closed validation rejects invalid shape, nonfinite/nonpositive/over-horizon remainder and inconsistent deadline. The existing world-owned 60-second horizon is unchanged.

This changes the previous decision that all sampling progress was disposable, rather than changing sensing cadence or implementing the whole proportional-step proposal. Current database/save markers become 4 / `development-2026-10-02-native-continuation`. Earlier development formats are refused without conversion, reset or deletion. The later cross-engineer pass must reconcile that marker and the shared native/type/persistence owners with peers' format-3 deliveries.

A bounded operational continuation scenario covers contact, the same wall slit and ordinary native flight, each saved after 10 game seconds and continued for 20 seconds. Every publication is frozen, exercising actual continuation reuse. **All nine comparisons** (1-second, 30-second and whole remaining-span offers for each scene) match uninterrupted authority **exactly**, including numerical values, revisions, ordered events, audiences, randomness and IDs. Independent forks match; no-op validation preserves the original identity/remainder; semantic name edit and a real cancel command discard it; pause advances no time and resume retains the same outcome. Invalid saved remainder examples are refused. A real admitted follow action ending at game time 10 retains its six-second remainder after time 4 and restores exactly; a newly rederived deadline at time 5 takes precedence over the old ending value. A further valid native route exercises a two-second hover, vertical landing and seven-second grounded wait. Saving at times 4, 11 and 18, then continuing 20 seconds with each offer, gives nine additional exact matches, including landing/takeoff evidence and audiences. Fixtures clone the authored world before isolated setup so pre-existing derived metadata cannot survive direct fixture edits; an earlier un-cloned flight setup was discarded as invalid evidence. These checks close the demonstrated contact/wall restoration defects and exercise these flight transitions; they do not establish universal restore or exact onset dating.

The real PostgreSQL scenario commits the contact midpoint, writes and reads a manual checkpoint through `GameSaves`, closes/reopens the repository, then continues both restored worlds for the three offers. Full stored authority and all six continuations match exactly. Changing only this owned fixture's database marker to the preceding value produces explicit startup refusal; its marker and one stored world remain unchanged. Fixture cleanup drops only owned databases. No compatibility reader or permanent legacy fixture was added.

**Smaller sight calculations.** Review found repeated temporary arrays in every movement proof and repeated displacement-range computation for the same body within one sensory query. The proof now compares the two path endpoints and each path's intermediate breakpoints directly; a difference of piecewise-linear paths reaches its largest discrepancy at those boundaries, so sorting and copied/clipped paths are unnecessary. Scalar body comparison avoids a keys array/callback, and a local map reuses each body's displacement range only within that unchanged query. There is no additional cross-call cache or invalidation policy. A direct operational probe retains an unchanged certain pair, rejects a route with the same current pose/final destination but changed middle section, removes incident pairs even with a missing track, leaves exact reverse memberships and preserves independent fork maps/sets.

**Fresh matched native measurements.** Node v22.23.2, Apple M1 Pro/10 cores, the locked dependencies, frozen snapshots and the exact dense/added-static manifests above are retained. Planning source is a fresh private archive; its package resolution prints paths inside that archive. Both sides use byte-identical scenario/native tooling, with per-call CPU and monotonic windows. Three pairs per case alternate baseline-first, candidate-first, baseline-first. Host one-minute load at each launch ranges 22.44–33.31; this remains shared-host evidence. All runs complete 60 warmup + 300 measured game seconds in ten measured offers. There is no unfinished-throughput sample.

| Case         | Pair | Baseline CPU / wall ms  | Reviewed CPU / wall ms  | Baseline p50 / p95=max ms | Reviewed p50 / p95=max ms |
| ------------ | ---- | ----------------------- | ----------------------- | ------------------------- | ------------------------- |
| Dense        | 1    | 17,306.782 / 17,233.910 | 16,949.345 / 16,862.487 | 1,692.812 / 2,684.672     | 1,550.901 / 2,744.325     |
| Dense        | 2    | 17,980.303 / 17,907.515 | 16,784.114 / 16,445.152 | 1,721.779 / 2,844.970     | 1,531.658 / 2,636.610     |
| Dense        | 3    | 17,213.407 / 16,873.533 | 17,943.403 / 18,347.051 | 1,595.162 / 2,684.836     | 1,684.328 / 3,236.861     |
| Added static | 1    | 19,084.048 / 20,344.907 | 17,789.620 / 17,375.506 | 1,758.593 / 3,910.361     | 1,593.068 / 2,894.685     |
| Added static | 2    | 17,906.387 / 17,476.935 | 17,252.886 / 16,787.406 | 1,549.018 / 3,153.347     | 1,560.330 / 2,856.774     |
| Added static | 3    | 17,858.520 / 18,443.606 | 17,020.401 / 16,533.013 | 1,678.931 / 3,481.592     | 1,538.324 / 2,994.831     |

Dense median CPU/wall change is **−2.065% / −2.155%**; maximum-call median changes **+2.216%**, with one 3,236.861 ms outlier. Added-static median CPU/wall/max change is **−3.650% / −8.980% / −16.857%**; its prior consistent +17.6% tail regression does not recur. These small CPU medians on a shared host are not a quiet-host speed guarantee. Every pair has identical exact event/outcome/ID/RNG trace and awareness digests. Detailed full-world comparison for each first pair matches at six decimal places after excluding only the newly specified saved progress; the only key-order differences are 40 sighting-identity mappings, whose entry order has no authority. Existing state revisions remain equal.

Selected current counts are unchanged from the earlier proven reduction: 47 binding assignments/insertions, 5 removals, 15,624 exact pair evaluations, 15,561 incident invalidation visits and 15,309 separate pruning visits; peak 3,087 pairs/112 tracks. Global roots still cost 149,661 visits dense and 253,161 added-static. The fresh planning archive has its original general counters, without reconstructing old selective observational patches; historical exact selected-operation baseline counts above remain their evidence. Heap end samples span 82.8–128.7 MB baseline and 101.96–136.54 MB candidate across these cases; they are allocation/GC-dependent end samples, not retained-memory or leak qualification.

The profiler now brackets `Profiler.start` because Inspector and `hrtime` can use different monotonic origins. Without calibration, apparent sample/call alignment was invalid. Four additional diagnostic runs use those explicit bounds: prior independent source CPU/max 18,823.070/3,029.295 ms versus reviewed 16,744.160/2,612.219 ms; planning 17,151.884/2,665.056 versus reviewed 17,606.722/2,778.014. The mixed direction reinforces the variance limit. In the calibrated reviewed fifth call, CPU is 2,722.672 ms and wall 2,612.276 ms. Excluding samples within the ±66.589 ms start-calibration uncertainty of its edges, inclusive sampled owners include existing landing-distance work 812 ms, encounter snapshot/current-value copying 774 ms, sight-bound work 254 ms and GC 85 ms. These overlapping sampled wall times cannot be added or treated as exclusive CPU. They identify remaining flight/draft/exposure cost; they do not fully attribute the earlier uncalibrated outlier or excuse a capacity failure. Broader constant-cost publication and world-wide sampling remain parent work.

Reproduction for the new bounded operational scenarios and profiles (all raw files outside Git):

```sh
# Owned archives use their own tsconfig/module resolution and shared third-party dependencies.
AI_BUDGET_USD=0 TSX_TSCONFIG_PATH=/private/tmp/NEW-planning/tsconfig.json \
  /Users/mzw/.nvm/versions/node/v22.23.2/bin/node --import tsx \
  scripts/stress-native.ts /private/tmp/NEW/dense.json /private/tmp/NEW/profile.cpuprofile

AI_BUDGET_USD=0 /Users/mzw/.nvm/versions/node/v22.23.2/bin/node --import tsx \
  /private/tmp/openlegend-eng1-review.afva0h/continuation-review.mjs
AI_BUDGET_USD=0 /Users/mzw/.nvm/versions/node/v22.23.2/bin/node --import tsx \
  /private/tmp/openlegend-eng1-review.afva0h/path-review.mjs
AI_BUDGET_USD=0 OPENLEGEND_TEST_DATABASE_URL=postgresql://mzw@127.0.0.1:56564/postgres \
  /Users/mzw/.nvm/versions/node/v22.23.2/bin/node --import tsx \
  /private/tmp/openlegend-eng1-review.afva0h/checkpoint-review.mjs
```

No provider call was made; added Jev/provider cost and outstanding exposure are **$0**. Last previously reported shared task settled/reserved/uncertain total is $0; it has not been refreshed because the owner stopped inter-task communication. This creates no integration spending allowance.

**Fresh actual PostgreSQL server evidence.** Each of the six launches uses a fresh generated dense fixture, an owned database on isolated PostgreSQL 14.17 port 56564, ephemeral HTTP port, continuous independent HTTP/SSE/presence load, 60 real seconds of warmup and 15 real seconds of measurement at one requested speed. Baseline and candidate use identical scenario/server instrumentation; the private planning archive has only observational timing added. Baseline format is 2 and candidate format is 4; each reopens only its own compatible fresh database. Unlike the earlier successive-speed report, each speed starts from the same fresh scene, rather than the preceding speed's evolved world. This is zero-provider native/server evidence, without browser or integrated-survival qualification. All six exit 0 with no load-generator/storage/cleanup error; every measured command is accepted, so no rejected-command latency sample exists. Phase-start one-minute host load ranges 18.34–24.94.

| Speed / source | Warm game seconds / ending debt | Measured wall seconds / nominal demand | Newly admitted / advanced game seconds / ending debt | Achieved × | Longest iterator / no-yield ms | Accepted command p95 / max ms |
| -------------- | ------------------------------- | -------------------------------------- | ---------------------------------------------------- | ---------- | ------------------------------ | ----------------------------- |
| 1× / planning  | 219.394 / 117.349               | 15.971 / 958.259                       | 0.000 / 62.273 / 55.077                              | 0.06499    | 253.400 / 254.707              | 1132.568 / 1132.568           |
| 1× / candidate | 219.394 / 176.528               | 15.761 / 945.663                       | 0.000 / 71.818 / 104.710                             | 0.07594    | 218.116 / 220.634              | 842.640 / 890.821             |
| 3× / planning  | 213.291 / 2267.764              | 15.541 / 2797.420                      | 0.000 / 63.485 / 2204.280                            | 0.06808    | 333.931 / 339.085              | 908.708 / 985.121             |
| 3× / candidate | 229.394 / 1648.089              | 15.903 / 2862.622                      | 0.000 / 69.697 / 1578.392                            | 0.07304    | 214.438 / 217.363              | 846.851 / 861.027             |
| 8× / planning  | 210.727 / 5320.719              | 15.819 / 7592.958                      | 0.000 / 52.727 / 5267.991                            | 0.05555    | 563.213 / 570.675              | 1975.515 / 1975.515           |
| 8× / candidate | 243.485 / 8325.664              | 15.551 / 7464.333                      | 0.000 / 73.030 / 8252.633                            | 0.07827    | 322.271 / 323.838              | 806.639 / 937.554             |

Nominal demand is measured wall time × 60 game seconds × requested speed; it was not all admitted. Every measured phase drains warmup debt, with zero newly admitted time. Both source trees miss every requested capacity rate and current command-latency budgets. Candidate command p95 falls in all three pairs and actual progress rises, but these short wall-timed samples evolve differently and cannot establish a general throughput improvement. Presence is maintained without errors here, unlike the preceding contended run; this is not a sustained-presence soak. Existing eight-millisecond cooperative yield intent remains exceeded by indivisible calls; no debt is dropped and no budget is relaxed.

Candidate measured maximum queue/projection/persistence times are recorded below; baseline values and full stage distributions remain in private reports. These maxima overlap other stages and cannot be added. End heap/RSS samples do not establish retained-memory limits.

| Speed | Candidate queue / projection / persistence max ms | Candidate heap / RSS MB | Baseline heap / RSS MB |
| ----- | ------------------------------------------------- | ----------------------- | ---------------------- |
| 1×    | 407.368 / 113.442 / 105.443                       | 112.90 / 562.20         | 215.64 / 522.04        |
| 3×    | 433.243 / 91.302 / 110.487                        | 225.40 / 594.54         | 193.70 / 552.60        |
| 8×    | 408.323 / 106.591 / 92.529                        | 304.30 / 639.45         | 218.24 / 333.46        |

Reproduction (one speed per independent launch; repeat for both source directories and 1, 3, 8):

```sh
AI_BUDGET_USD=0 OPEN_LEGEND_PROFILE_POSTGRES_URL=postgresql://mzw@127.0.0.1:56564/postgres \
  OPENLEGEND_PROFILE_SERVER_WARMUP_SECONDS=60 \
  /Users/mzw/.nvm/versions/node/v22.23.2/bin/node --import tsx \
  scripts/performance/profile-server.mjs /private/tmp/NEW/dense.json \
  /private/tmp/NEW/server-1.json 15 1 500
```

**Remaining acceptance.** The demonstrated restore defect is repaired, and all three scoped work reductions remain effective. Dense outlier attribution, sustained requested-rate/latency qualification, survival/body integration, browser/multiple-player/mature-history qualification and PW06 remain open with their existing owners. Fixing global sampling/draft/publication and landing-distance costs would expand beyond the three approved reductions; this pass introduces no scheduler rewrite, population cap, weaker fidelity or offscreen freezing.

**Published source and cleanup.** The reviewed runtime and canonical contracts are committed as **`1586d4ef906876fd76cec3256951e6f4ba39dc9b`**, with required full CI passing as recorded in [Level-1 review verification](level1-decisions.md#independent-review-full-check). Performance and continuation probes used this runtime behavior; subsequent kernel comment changes only explain the saved-bound precedence. Final source hashes below pin the published files. Full affected branch diff and final review-fix diff were inspected; no additional concrete PW01 defect or justified unrelated refactor was identified. No test assertions/timeouts, dependencies or lockfile changed in this review. All owned server/load-generator processes ended; zero fixture databases remained, then only the owned PostgreSQL port 56564 was stopped and its cluster removed. Profiles/reports remain private outside Git.

```text
packages/domain/src/kernel.ts f376300423526a3262b51500fccb6842ba548f44fa4ec73144d6976f041d3027
packages/domain/src/motion-boundaries.ts 4e338cab7040b9a46762ff71126647289c869919042128ca17a548163889beb5
packages/domain/src/draft.ts dd23bc2f23769941c408c85e2306c38ca9cc4a67b620a20dba9d84994aab3600
packages/domain/src/world-modules.ts 31f3bb8665b98ad991fe79ac9f17035da8f5de5b2363c18df6a16e091277769e
scripts/profile-native.ts 49e680d0697f3ce56182db41dcd520553af970826474dfc1bcba2f02c2a66f77
```

## NP02 sensory preparation — October 3, 2026

**Scope and revisions.** NP02 removes repeated full-population source preparation for complete warm sensory changes. Baseline is `b528af6d126a9ac500dbe5574642dea87c472c40`; candidate is the reviewed working diff on `codex/np02-changed-object-sensing` from that commit. Refreshed `origin/main` is `1253415bad1560c98fc320fad060dc444e4bbcaa`, already an ancestor. Baseline profiling adds observational capture/comparison/bin-entry counters only. No scheduler, movement, sense, random order, witness quota or memory policy changes. The obsolete separate object cache and its 256-observer retention ceiling are removed; [SP03](../limits/spatial.md#sp03) records the previous rationale and replacement. [Architecture](../architecture.md#change-driven-exposure-and-reaction-intake) owns behavior; [NW16](../limits/native-work.md#nw16) owns performance choices; [NP02](../maintainers/parallel-batch-02-foundations-and-usability.md#np02--sensory-work-follows-changed-objects), EPR02/PF12.3/PF13.11 and C18 own delivery and remaining work.

All matched timing profiles below ran sequentially on Apple M1 Pro/macOS with Node `v22.23.2`, frozen snapshots and `AI_BUDGET_USD=0`. Dependencies use the unchanged pinned lockfile. These are shared-host observations, not quiet-host deployment capacity. Earlier exploratory iterations are superseded by the selected measurements; no earlier timing is mixed into the tables. The timing profiles precede the follow-up contact-baseline repair described below. Raw fixtures, complete traces, reports and CPU profiles remain outside Git.

**Observation correctness.** A disposable native scenario compared all world fields, ordered returned events, retained events/awareness, visible lists, episode identities, simulation time, IDs and saved randomness at **40 checkpoints** against full preparation in the baseline runtime. A temporary candidate oracle additionally compared every prepared source input and canonical source order with current authoritative physical roots at every phase. For unclassified insertion/replacement cases the reference deliberately enumerated the actual table rather than trusting potentially stale derived root membership. The final diagnostic-enabled replay also matched the complete reference traces. The oracle is removed from runtime. A separate warm overflow scenario introduces 4,100 objects and places object 4,100 beside the player. Candidate and baseline complete world/event traces match: all three observers retain all 4,100 visible objects and 12,300 new episode bindings, including the object beyond the 4,096-scope ceiling. Candidate diagnoses one overflow rebuild of 4,115 physical roots and a scope peak of 4,096; no sighting is truncated.

Coverage includes three source moves around actual sensing phases inside one unpublished draft; two separated groups and a moving observer; old and new source neighborhoods; appearance/kind/fire/resource/remains changes; containment and return; real spawning, retirement, death, incapacitation and participation; blocked/re-enabled senses and memory capability; increased body dimensions and sight range; map/manifest replacement including an unchanged manifest revision; unknown insertion without a membership notice; consecutive unobserved commands; ancestor forks, abandoned iteration and JSON reopen. Both 4,100-source insertion and in-place outward edits exceed the bookkeeping ceiling and retain complete outcomes. A contact-only observer walking past a person records both onset and end in one outer advance (18.181819181818184 and 27.272728272727278 game seconds); a walker crossing a narrow wall slit produces arrival and departure within one outer advance. Cold and warm queries separately preserve JavaScript numeric-ID ordering (`2` before `7`, despite reverse insertion). A focused candidate-index check also retains 150,000 entries in one cell in exact order. Review first reproduced a JavaScript argument-limit failure in the new bulk append, then fixed it with iteration before final profiles. This primitive check is not whole-world capacity evidence.

A second small scenario compares complete transition/world traces for **14 real native operations**, including dropping a held tool to a physical pile, picking it up, status-based sleep/perception loss and cancellation, a queued command dispatched inside an advance, native person admission, an observer walk and discarded speculative perception followed by continued authoritative play. All match. Focused existing perception/spatial/kernel checks pass **29 tests in three files**. The existing PostgreSQL world-service reopen check passes **one selected test** (12 others deliberately skipped), restoring work and pause preferences without repeated commands or elapsed real time. `pnpm typecheck`, `pnpm build`, changed-file pinned Prettier and affected-diff review pass. Build retains the existing PlayCanvas `node:worker_threads` externalization and large-chunk warnings. No browser or live-provider qualification is claimed.

The 40-checkpoint diagnostic replay contains 60 actual sensory phases: **6 cold, 5 unknown-coverage, 6 policy and 2 overflow rebuilds**, 8,510 rebuilt root entries, 172 selected observers and a maximum **4,096 combined scopes**. It records 571 exact sight tests, 66 recorded occurrences and 70 awareness writes. These totals include intentional recovery/overflow fixtures and are separate from the warm performance workload. Instrumentation does not affect simulation branching.

**Requested follow-up review.** Complete-diff and caller review reproduced a stale contact starting position after an unobserved whole-entity or entity-table replacement: a person moved from X=12.2 to 12.3 before the next step, but a stationary touch was incorrectly reported as moving during that step. Incomplete/overflowed deferred coverage now reconstructs those positions from authoritative roots, retaining incremental reuse for complete warm changes. A disposable scenario compares complete worlds, contact episodes and ordered events with full preparation after record replacement, table replacement and 4,100 in-place outward edits. All three cases match both through real sensing initialization and ordinary one-second native advancement; stationary contact remains present with no false movement event. The complete 40-checkpoint replay still matches, with the same sensory/observation totals above. Its total root walks rise from 93 to 97 and root visits from 17,886 to 22,053, an explicit correctness cost for uncertain baselines. Focused existing checks again pass 29 tests; typecheck and production build pass. A fresh 5,000-object warm run retains exactly 60 captures/comparisons, 60 updated entries, 180 selected observers/tests, 61 root walks and 305,915 root visits, with all three final digests equal to the profiled candidate. The contact callback was also simplified. No other actionable in-scope defect remained after the resulting diff review. Earlier PostgreSQL recovery evidence remains applicable; the wall-timed server workload was not rerun for this repair, so its timings describe the profiled candidate before the additional uncertain-baseline walks.

**Warm sparse growth.** Starting from seed 73, a 256×256-metre map contains the same default inhabitants and one bird continuously following a four-point ten-metre square near the initial characters. Added static resource objects occupy a distant group at X/Z 200–219. Each fresh run warms for ten one-second native calls, then offers sixty identical one-second calls with one interval per call; all sixty measured game seconds complete. There are three sensing actors and one flight body. Two baseline/candidate repetitions use the same fixture and offered-time schedule for each size. Every pair has identical final world, semantic-world and awareness digests; correctness trace comparison above is a separate check.

| Distant objects | Captures and source comparisons, baseline → candidate | All root visits, baseline → candidate | Total wall ms, baseline → candidate (two runs) | Total process CPU ms, baseline → candidate (two runs) |
| --------------- | ----------------------------------------------------- | ------------------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| 100             | 6,900 → 60                                            | 20,815 → 7,015                        | 256.17 → 245.15; 235.19 → 237.72               | 332.92 → 327.18; 319.48 → 313.06                      |
| 1,000           | 60,900 → 60                                           | 183,715 → 61,915                      | 425.15 → 247.09; 364.54 → 256.11               | 492.59 → 337.93; 480.27 → 351.01                      |
| 5,000           | 300,900 → 60                                          | 907,715 → 305,915                     | 861.18 → 636.41; 873.78 → 477.88               | 1,043.52 → 631.45; 1,032.76 → 607.62                  |

Candidate work is identical at every size: 60 sensory phases, **60 changed source entries**, no measured rebuild, scope peak two, 14,995 created-draft visits, 180 selected observers, 180 exact sight tests and 900 sight-cache hits. Baseline exact tests/cache hits are the same. Spatial entries prepared fall **600 → 180** and root enumerations **181 → 61**; 1,800 returned spatial candidates remain equal. Those spatial counters include the unchanged motion predictor and its grids, not just sensory bins. No new encounters or awareness are written during the measured warm interval; both finish with the same seven earlier occurrences/awareness records. Source preparation is constant with distant static growth; total root visits and total cost are not.

At 5,000 distant objects, matched wall cost falls about **26–45%** and total process CPU about **39–41%**. At 100 objects, process CPU falls only about **2%**, while wall time is mixed (about 4% lower in one pair and 1% higher in the other). Earlier pre-review runs on this host showed an 18–20% small-scene CPU regression and 43–44% wall regression before the candidate-index append fix; they are historical observations, excluded from the final table. Host/software variation prevents attributing that change to the append fix or claiming a reliable small-scene gain. Candidate warm p95 ranges 6.39–6.57 ms at 100 objects, 5.32–5.51 ms at 1,000 and 9.63–22.09 ms at 5,000. The first 5,000-object pair's p95 regresses (17.90 → 22.09 ms), despite lower total CPU/wall cost; shared-host tails remain variable. At 5,000 objects the CPU profile still identifies entity-table shallow copying/finalization: sampled self wall attribution includes 121.62 ms in Immer shallow copy, 126.75 ms in property finalization and 38.79 ms in its iteration helper in one candidate run. These samples are not exclusive process CPU or a separately timed publication total. Remaining native participant enumeration accounts for population-dependent root visits; finalization is still indivisible.

**Cold/dense first exposure.** Seed 73 with 20 added people, 20 animals and 100 resource objects in one crowd has 213 entity records, 155 physical roots and 23 sensing observers. Thirty one-second calls run without warmup. Both repetitions have equal final/semantic/awareness digests. Candidate performs one cold rebuild of 155 roots, **155 captures/comparisons versus 4,650**, 333 spatial-entry preparations versus 1,781, and 5,270 total root visits versus 14,260. Both still perform **3,542 exact sight tests**, bind 3,527 new episodes and write **507 occurrences/507 awareness entries**; 23 observers examine their exposure and 667 later observer visits reuse it. Required output is unchanged.

Cold first-call wall times are baseline **76.77/106.00 ms** versus candidate **91.15/98.20 ms**. Thirty-call totals are **373.48/445.65 ms → 439.48/439.05 ms**; process CPU is **531.67/589.83 ms → 591.66/605.73 ms**. Candidate process CPU rises about **3–11%**; one wall total improves slightly while the other regresses. Input preparation falls, but genuine first-exposure fan-out and record publication remain expensive; these timings do not establish dense capacity or a cold-tail improvement.

**Actual PostgreSQL server.** Four independent sequential launches use the same fresh crowd scenario, an owned disposable PostgreSQL database on loopback, ephemeral HTTP listener, an independent HTTP/SSE/presence load generator, ten seconds of offered load at requested 3× and approximately two seconds of request drain. Each performs ten commands, with seven admitted moves and three cancellations, without rejected commands or client/storage errors. No paid cognition or browser runs. The clock supplies 60 game seconds per real second at 1×; achieved × below uses actual advanced game time divided by that clock's wall-time demand, including drain.

| Run         | Actual advanced game seconds / wall seconds | Achieved × | Command p50 / p95=max ms | Server process CPU ms | Event-loop max ms |
| ----------- | ------------------------------------------- | ---------- | ------------------------ | --------------------- | ----------------- |
| Baseline 1  | 2,152.66 / 12.035                           | 2.98114    | 198.00 / 699.41          | 10,329.82             | 122.42            |
| Candidate 1 | 2,160.15 / 12.028                           | 2.99313    | 254.39 / 941.04          | 11,068.51             | 67.76             |
| Baseline 2  | 2,143.30 / 12.025                           | 2.97062    | 199.51 / 498.58          | 11,237.75             | 86.31             |
| Candidate 2 | 2,152.85 / 12.011                           | 2.98745    | 113.77 / 508.68          | 9,883.09              | 59.74             |

Candidate capture/comparison totals are **2,501/2,445**, versus baseline **43,400/43,245**. Candidate runs rebuild once cold and **10/9 times for unknown coverage**, including command publications, totaling **1,705/1,550 rebuilt roots**; scope peak is 44 and there is no policy/overflow fallback. Candidate selected observer counts are **6,096/7,246**; sight tests **16,004/17,239**; occurrences **706/739** and awareness writes **5,111/5,870**. These wall-timed runs evolve differently and receive commands at different game times, so these are actual workload observations, not paired semantic parity or equal-work CPU measurements. Server process CPU rises in one pair and falls in the other. Starting one-minute host load ranges **31.86–42.23** and changes across launches. Command tails are mixed and remain **0.51–0.94 seconds**. Earlier pre-review pairs observed lower candidate tails (0.51–0.54 seconds versus baseline 1.29–1.33 seconds); those historical results are excluded from the final table and do not establish a repeatable gain. Host contention and different scheduling prevent general attribution or a capacity claim.

Measured candidate native finalization maxima are **3.36/1.19 ms**, native no-yield maxima **41.92/35.89 ms**, projection maxima **39.99/23.50 ms**, and persistence transaction maxima **590.21/473.21 ms**. These stage maxima overlap other stages and cannot be added. They distinguish finalization, indivisible native operations and server publication/persistence from sensory preparation. No eight-millisecond preemption guarantee, sustained release throughput, mature-history, browser/multiple-player or live-provider acceptance follows from this report.

Reproduction uses the existing maintained profilers, with fresh private fixture/output paths per run; construct the sparse/dense scenes and schedules described above rather than reusing another user's saved world:

```sh
AI_BUDGET_USD=0 node --import tsx scripts/stress-native.ts \
  /private/tmp/NP02/moving-scenario-5000.json /private/tmp/NP02/native.cpuprofile
AI_BUDGET_USD=0 OPEN_LEGEND_PROFILE_POSTGRES_URL=postgresql://localhost/postgres \
  node --import tsx scripts/performance/profile-server.mjs \
  /private/tmp/NP02/dense.json /private/tmp/NP02/server.json 10 3 1000
```

**Remaining ownership.** NP02 acceptance is complete. EPR02/PF12.3 retain affected-observer target-only queries, observer/audit overhead and dense capacity; PF13.11 and proportional-work stages retain broader exact/regional scheduling, native participant enumeration and publication. C18 retains first-exposure fan-out, indivisible operations/finalization, retained-memory growth and sustained release qualification. No population or witness limit was added to conceal these costs. No provider calls were made; added provider cost and outstanding exposure are **$0**.
