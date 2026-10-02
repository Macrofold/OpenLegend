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
