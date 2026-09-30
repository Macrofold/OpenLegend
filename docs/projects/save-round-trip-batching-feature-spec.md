# Save round-trip batching — feature spec

**Status: proposal, not approved for implementation.** Written 2026-09-29 at Mike's request as a follow-up to [background world saves](ordered-async-saves.md). Implementation needs a separate chat go-ahead. Technical design: [save round-trip batching — technical design](save-round-trip-batching-tech-design.md). Work items: [PF15](../maintainers/performance.md#pf15--save-round-trip-batching).

## Purpose

Every world save sends its SQL statements to PostgreSQL one after another, waiting for each reply before sending the next. Each of those waits is one **round trip**. When a round trip is slow — a database on another machine, or a busy one — a save takes roughly _number of statements × round-trip time_, no matter how little data it writes.

This feature sends a save's statements in a few round trips instead of one per statement. It shortens both kinds of save ([definitions](../save-and-load.md#background-and-synchronous-world-saves)):

- **Synchronous saves** (player commands, AI characters' finished actions and replies, pause/resume, editors, loads) hold the world's update line until they are written, so a shorter save directly means less freezing.
- **Background saves** (simulation progress) finish sooner, which reduces backpressure on game time and shrinks how much progress a crash can lose.

It changes only how the statements travel to the database. What is saved, the order of its effects and the all-or-nothing guarantee stay exactly the same.

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

Measured on this branch's scene runs ([evidence](../verification/ordered-async-saves.md#matched-scene-runs-pf00-delay-cases)): **17–23 statements per save on average, 44 at most.** With no added delay on the loaded shared host, one round trip cost about 5–7 ms; with 25 ms added to every statement (the PF00 slow-database case) the median save took 720–830 ms, almost all of it waiting on round trips.

## What was tried before

On 2026-09-27 the [three-times scene project](three-times-scene-performance.md) tried sending several statements as one text block and rejected it after inconclusive measurements: that form cannot use bound parameters, so every value had to be turned into SQL text, and on a local database the gain was lost in host noise ([performance note](../performance.md)). This proposal differs in two ways:

- It keeps bound parameters; no value is ever written into SQL text.
- It is gated on the database's real round-trip time. The earlier test ran against a local database, where round trips are cheap; the PF00 measurements since then show that round trips dominate save time once the database is slow.

## When it is worth doing

The time saved per save is about _statements removed × round-trip time_. With a typical save going from about 20 round trips to about 3:

| Database                                                         | Round trip | Saved per save (approx.) |
| ---------------------------------------------------------------- | ---------: | -----------------------: |
| Local, quiet machine                                             | 0.1–0.3 ms |                   2–5 ms |
| Local, heavily loaded shared host (measured)                     |     5–7 ms |                85–120 ms |
| Managed database in the same region                              |     1–2 ms |                 17–34 ms |
| Remote database, or the PF00 25 ms case (measured median 0.75 s) |   20–50 ms |              0.34–0.85 s |

**Recommendation.** Not needed for the current single-machine setup on its own. Worth doing before any deployment whose database is on another machine, or if the quiet-host PF00 rerun still shows save-dominated stalls. The first stage (measuring the real round-trip time and trying the mechanism on a disposable database) is cheap and settles the question.

## Supported behavior (target)

1. A typical save — background or synchronous — reaches the database in about three round trips: start the transaction, send the writes, commit. A save that must read something from the database partway through (for example a job record) adds about one round trip per read.
2. The database ends up with exactly the same rows as today for the same sequence of saves.
3. The all-or-nothing guarantee is unchanged: a save either lands completely or not at all.
4. Conflict detection is unchanged: a competing writer, or a record created twice, still makes the save fail and roll back.
5. Failure handling is unchanged: a failed save still stops further saving and pauses the world with the storage message; a failure during the final commit is still treated as "may have saved" and resolved on restart.
6. Very large saves (loads, imports, large history batches) are split into bounded groups and still succeed, possibly with more round trips.
7. An operator setting turns batching off (one statement per round trip, as today) until it is qualified.

## Scenarios

- **A player walks somewhere, managed database with 2 ms round trips.** Today about 20 round trips (≈40 ms plus database work) hold the update line; with batching about 3 (≈6 ms plus database work).
- **An AI character's reply is applied.** Its synchronous save writes conversation and history tables. Same effect as above; the reply appears sooner and the world freezes for less time.
- **Background save on a slow database (25 ms round trips).** A 0.75 s save becomes about 0.3 s; game time rarely has to wait for it, and the crash-loss window shrinks by the same amount.
- **Loading a save or importing a world.** Large writes are split into several groups; the outcome is identical to today.
- **Diagnosing a failed save.** The error still reports the PostgreSQL error code; the profiler reports round trips and statements per save.

## Failure cases (must behave exactly as today)

- A record created twice inside a batched group: the whole save rolls back; the same failure is reported and latched.
- Another writer changed the world: the save is refused and rolled back.
- A batched group exceeds the 30-second statement limit ([LA175](../limits/persistence.md#la175)): the save rolls back and is reported. Group size bounds keep this as rare as today's single-statement case.
- Connection lost mid-group, or the commit itself fails: the outcome is uncertain, exactly as today; restart reconciles from the database.
- Process killed mid-save: nothing partial is visible after restart.
- The database writer queue is full or busy: refused before the transaction starts, as today ([SV20](../limits/persistence.md#sv20)).

## Scope and non-goals

- **In scope:** world saves (background and synchronous) through the PostgreSQL adapter; later, optionally, other write transactions that use the same adapter.
- **Not in scope:** moving commands and AI results to background saves (PF05, a separate open decision); combining several saves into one transaction; changing what is saved, the schema or the save format; reads and checkpoint capture; changing the database driver unless the first stage shows it is necessary.

## Acceptance criteria

- **Equivalence:** with batching on and off, the same drills and scene produce identical database contents (per-table row hashes) and the same durable revisions.
- **Round trips:** a typical background save and a typical command save use at most 4 round trips, as counted by the adapter; the maximum is bounded by the group limits.
- **Latency:** in matched runs with 25 ms added per statement, the median synchronous save is at least 40% shorter than the same-host baseline; the 0 ms and 100 ms cases and a quiet-host run are reported.
- **Failures:** the existing failure and crash drills, plus a failure inside a batched group, a statement timeout inside a group and a commit failure, produce the same outcomes as today.
- **Off switch:** the setting that disables batching works and is documented; the default is decided only after the criteria above pass.

## Stages

0. **Decision gate and trial.** Measure the round-trip time of the database this game will actually use. Classify every statement in a save by whether its result is needed. Try the proposed mechanism on a disposable database and confirm PostgreSQL's rules for combined statements.
1. **Free round trip.** Send "start transaction" and "set time limit" together.
2. **Write groups.** Batch the pure writes of a save (world tables, history, revision advance) into groups flushed before any read and before the commit.
3. **The rest of the save.** Include memory index upkeep and, if measurements justify it, other write transactions.
4. **Qualification.** Equivalence, failure drills, matched scene runs, then choose the default.

## Maintained records

- Implementation: [PF15](../maintainers/performance.md#pf15--save-round-trip-batching).
- Limits and constraints: [LA174](../limits/persistence.md#la174) (write batch bounds) and [LA175](../limits/persistence.md#la175) (statement time limits), which this feature would change; proposed values are in the [technical design](save-round-trip-batching-tech-design.md#proposed-limits).
- Related contract/design: [technical design](save-round-trip-batching-tech-design.md); [background and synchronous saves](../save-and-load.md#background-and-synchronous-world-saves); [runtime performance design](../performance.md).
