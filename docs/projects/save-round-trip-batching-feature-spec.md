# Save round-trip batching — feature spec

| Status      | Current progress                                                                                                           | Last updated |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Not started | This unapproved proposal requires a current-source feasibility trial before any batching implementation or default change. | 2026-10-03   |

**Status: proposal, not approved for implementation.** Written 2026-09-29 at Mike's request as a follow-up to [background world saves](completed/ordered-async-saves.md). Implementation needs a separate chat go-ahead. Technical design: [save round-trip batching — technical design](save-round-trip-batching-tech-design.md). Work items: [PF15](../maintainers/performance.md#pf15--save-round-trip-batching).

## Purpose

Every world save sends its SQL statements to PostgreSQL one after another, waiting for each reply before sending the next. Each of those waits is one **round trip**. When a round trip is slow — a database on another machine, or a busy one — a save takes roughly _number of statements × round-trip time_, when serial communication dominates the work; database execution, serialization, locks and host scheduling add their own costs.

The proposed feature would send eligible statements in fewer round trips. Its target is to shorten both kinds of save ([definitions](../save-and-load.md#background-and-synchronous-world-saves)):

- **Synchronous saves** (player commands, AI characters' finished actions and replies, pause/resume, editors, loads) hold the world's update line until they are written, so a shorter save directly means less freezing.
- **Background saves** (simulation progress) finish sooner, which reduces backpressure on game time and shrinks how much progress a crash can lose.

What is saved, required ordering, conflict/error precedence and all-or-nothing publication must stay the same. Combining SQL changes its execution semantics, not merely its transport; the feasibility trial must prove equivalence before any writer opts in.

## What a save sends today

A save writes the changes since the previous save inside one database transaction. Rows of the same table are already combined into one multi-row statement ([LA174](../limits/persistence.md#la174)); what remains is roughly one statement per changed table, plus bookkeeping:

| Part of the save                                                               | Statements (typical) |
| ------------------------------------------------------------------------------ | -------------------: |
| Start the transaction and set its time limit                                   |                    2 |
| Advance the world's revision number (detects a competing writer)               |                    1 |
| Event history (events, who perceived them, running total)                      |                  2–5 |
| Memory source index                                                            |                  0–2 |
| Changed world tables (people, positions, activities, conversations, receipts…) |                10–30 |
| Memory index upkeep                                                            |                  0–2 |
| Commit                                                                         |                    1 |

Measured in the September 29 source checkpoint, not a new measurement of current main ([evidence](../verification/ordered-async-saves.md#matched-scene-runs-pf00-delay-cases)): **17–23 statements per save on average, 44 at most.** With no added delay on the loaded shared host, one round trip cost about 5–7 ms; with 25 ms added to every statement (the PF00 slow-database case) the median save took 720–830 ms, with serial statement waits dominating the recorded attribution. Re-profile the current writers before adopting these counts or attributing all delay to the network.

## What was tried before

On 2026-09-27 the [three-times scene project](three-times-scene-performance.md) tried sending several statements as one text block and rejected it after inconclusive measurements: that form cannot use bound parameters, so every value had to be turned into SQL text, and on a local database the gain was lost in host noise ([performance note](../performance.md)). This proposal differs in two ways:

- It keeps bound parameters; no value is ever written into SQL text.
- It is gated on the database's real round-trip time. The earlier test ran against a local database, where round trips are cheap; the PF00 measurements since then show that round trips dominate save time once the database is slow.

## When it is worth doing

An illustrative communication-only saving is _round trips removed × round-trip time_. The following arithmetic assumes 20 round trips become 3; neither that reduction nor the environmental latency ranges are deployment measurements. The feasibility trial may require extra ordering barriers. Added query construction, planning, execution and lock costs must be measured separately:

| Database                                                         | Round trip | Saved per save (approx.) |
| ---------------------------------------------------------------- | ---------: | -----------------------: |
| Local, quiet machine                                             | 0.1–0.3 ms |                   2–5 ms |
| Local, heavily loaded shared host (measured)                     |     5–7 ms |                85–120 ms |
| Managed database in the same region                              |     1–2 ms |                 17–34 ms |
| Remote database, or the PF00 25 ms case (measured median 0.75 s) |   20–50 ms |              0.34–0.85 s |

**Recommendation.** Select this work only when current measurements show a material save-latency bottleneck. A database on another machine alone does not establish that benefit. The [production-deployment proposal](production-deployment-feature-spec.md) recommends managed PostgreSQL, but neither that recommendation nor this document establishes the actual deployment latency or authorizes implementation. Start with a bounded feasibility and cost trial; preserve correctness even if its required barriers miss the round-trip target.

## Supported behavior (target)

1. The target is a small number of round trips, subject to the acceptance threshold below. Reads, checked conflict fences, visibility dependencies, parent/child constraints and group bounds can require additional barriers. Three round trips is an optimistic case, not a promise for every current save.
2. The database ends up with exactly the same rows as today for the same sequence of saves.
3. The all-or-nothing guarantee is unchanged: a save either lands completely or not at all.
4. Conflict detection is unchanged: a competing writer, or a record created twice, still makes the save fail and roll back.
5. Failure handling is unchanged: a failed save still stops further saving and pauses the world with the storage message; a failure during the final commit is still treated as "may have saved" and resolved on restart.
6. Supported large current-format saves and restores use bounded groups without buffering the entire operation or weakening existing input limits; they can require more round trips. No old-format import or compatibility path is introduced.
7. An operator setting turns batching off (one statement per round trip, as today) until it is qualified.

## Scenarios

- **A player issues a movement command with a hypothetical 2 ms database round trip.** Reducing its synchronous command save from 20 to 3 round trips would reduce communication waits from about 40 to 6 ms, before other work. Subsequent simulation progress uses the separately defined background-save path. These are illustrative assumptions, not measured command counts or delivered results.
- **An AI character's reply is applied.** Its synchronous save writes conversation and history tables. Same effect as above; the reply appears sooner and the world freezes for less time.
- **Background save with 25 ms injected round-trip delay.** The goal is shorter writes and less storage backpressure. A 0.75 s baseline does not establish a 0.3 s result or a stall-free scene; current matched measurements must report the actual change in write duration, command latency and unsaved-progress window.
- **Loading a supported current-format save.** Large writes use multiple bounded groups inside the existing atomic transaction; the result and refusal behavior must match the unbatched path.
- **Diagnosing a failed save.** The error still reports the PostgreSQL error code; the profiler reports round trips and statements per save.

## Failure cases (must behave exactly as today)

- A record created twice inside a batched group: the whole save rolls back; the same failure is reported and latched.
- Another writer changed the world: the save is refused and rolled back.
- A batched group exceeds the 30-second statement limit ([LA175](../limits/persistence.md#la175)): the save rolls back and is reported. A group has a larger timeout scope than one old statement; bounds alone do not prove equal failure frequency. Qualify representative and worst-case groups without relaxing the deadline.
- Connection lost mid-group, or the commit itself fails: the outcome is uncertain, exactly as today; restart reconciles from the database.
- Process killed mid-save: nothing partial is visible after restart.
- The database writer queue is full or busy: refused before the transaction starts, as today ([SV20](../limits/persistence.md#sv20)).

## Scope and non-goals

- **In scope:** world saves (background and synchronous) through the PostgreSQL adapter; later, optionally, other write transactions that use the same adapter.
- **Not in scope:** moving commands and AI results to background saves (PF05, a separate open decision); combining several saves into one transaction; changing what is saved, the schema or the save format; reads and checkpoint capture; changing the database driver unless the first stage shows it is necessary.

## Acceptance criteria

- **Equivalence:** with batching on and off, the same drills and scene produce identical database contents (per-table row hashes) and the same durable revisions.
- **Round trips:** a specified representative background save and command save use at most 4 round trips, counted at the actual transport boundary. Large saves can use more groups; record their counts and work bounds rather than claiming a fixed maximum for arbitrary input. If mandatory correctness barriers prevent the representative target, report a failed decision gate and revisit the approach or target with the owner; do not remove barriers to pass.
- **Latency:** in matched runs with 25 ms added per actual database round trip (not per logical statement inside a group), the median synchronous save is at least 40% shorter than the same-host baseline; the 0 ms and 100 ms cases and a quiet-host run are reported.
- **Failures:** the existing failure and crash drills, plus a failure inside a batched group, a statement timeout inside a group and a commit failure, produce the same outcomes as today.
- **Off switch:** the setting that disables batching works and is documented; the default is decided only after the criteria above pass.

## Stages

0. **Decision gate and trial.** Measure the round-trip time of the database this game will actually use. Classify every statement in a save by whether its result is needed. Try the proposed mechanism on a disposable database, prove queue/flush progress and bounded memory, and verify ordering, failure precedence and PostgreSQL’s common-snapshot rules for combined statements.
1. **Free round trip.** Send "start transaction" and "set time limit" together.
2. **Write groups.** Opt eligible save writers into an explicit bounded enqueue/flush contract. Group only proven independent writes; preserve checked revision admission, reads and all required dependency barriers before commit.
3. **The rest of the save.** Include memory index upkeep and, if measurements justify it, other write transactions.
4. **Qualification.** Equivalence, failure drills, matched scene runs, then choose the default.

## Maintained records

- Implementation: [PF15](../maintainers/performance.md#pf15--save-round-trip-batching).
- Limits and constraints: [LA174](../limits/persistence.md#la174) (write batch bounds) and [LA175](../limits/persistence.md#la175) (statement time limits), which this feature would change; proposed values are in the [technical design](save-round-trip-batching-tech-design.md#proposed-limits).
- Related contract/design: [technical design](save-round-trip-batching-tech-design.md); [background and synchronous saves](../save-and-load.md#background-and-synchronous-world-saves); [runtime performance design](../performance.md).
