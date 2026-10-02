# Perception changes and one reaction intake

Approved in chat by Mike on 2026-09-28. The approval covers implementing the proposed [events, perception and reactions contract](../events-perception-and-reactions.md) within the scope below. It is not approval for the whole EPR program.

- **Base:** refreshed `origin/main` at `be68b1e0` (Rebase skill precedence 1: the task named the latest `origin/main`).
- **Branch:** `claude/perception-reactions-090227`.
- **Estimate:** about 1,300–1,700 logic lines, excluding tests.

This plan is durable because the work crosses domain/server contracts, changes privacy scope, adds saved and derived state, and is delivered in stages.

## Goal

- **Standing still:** characters notice when someone arrives or leaves, or an object appears, disappears or moves.
- **Goal changes:** characters reconsider what is already in view.
- **Ongoing conditions:** they stay in mind without repeated model calls.
- **One fair intake:** every reason to wake a character (speech, sightings, need thresholds, reminders) goes through one fair per-character intake, so wake-ups are neither lost nor duplicated and no busy character starves the others.
- **Speed:** crowded native scenes get measurably closer to the requested 3× rate, with identical outcomes wherever a change is only an optimization.

## Scope and owners

Work in this order. Commit each stage separately so the branch stays coherent and mergeable. Do not merge into `main`.

| #   | Item                                                                                                                    | Canonical tracker                                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | EPR00 baseline trace and bounded counters on the seed-73 workload                                                       | [EPR00](../maintainers/events-perception-and-reactions.md#epr00--baseline-invariants-and-task-ownership)                                                                                      |
| 2   | PF03/09 native CPU regression: Immer proxy/finalization and encounter costs, with identical outcomes, RNG and audiences | [PF03/09](../maintainers/performance.md#foundations-15-measurements-and-remaining-cost)                                                                                                       |
| 3   | EPR01 typed stimulus scope and actor intake metadata                                                                    | [EPR01](../maintainers/events-perception-and-reactions.md#epr01--typed-stimulus-scope-and-actor-intake)                                                                                       |
| 4   | EPR03 observer-private acquisition and exposure deltas                                                                  | [EPR03](../maintainers/events-perception-and-reactions.md#epr03--actor-private-perception-acquisition-and-exposure-deltas)                                                                    |
| 5   | EPR05 change-fed `ActorWork` and one intake with per-character fairness; also PF09's per-character thought eligibility  | [EPR05](../maintainers/events-perception-and-reactions.md#epr05--change-fed-actorwork-and-one-reaction-intake), [PF09](../maintainers/performance.md#pf09--population-work-follows-relevance) |
| 6   | EPR04 remaining parts: other state writers, sleep, first opportunity for a newly created hungry character               | [EPR04](../maintainers/events-perception-and-reactions.md#epr04--private-internal-threshold-events-and-native-protection)                                                                     |
| 7   | EPR06 persistent stimuli with bounded character-local relevance                                                         | [EPR06](../maintainers/events-perception-and-reactions.md#epr06--persistent-stimuli-and-bounded-actor-local-relevance)                                                                        |
| 8   | PF12.3, PF12.4 and SW08.4a dense first-exposure qualification, including the 344-entity first-sight burst               | [PF12](../maintainers/performance.md#pf12--eight-times-spatial-and-sensory-execution), [SW08](../maintainers/spatial-world.md)                                                                |
| 9   | PF08 flat resident entity map: measure alternatives and write them up                                                   | [PF08/09](../maintainers/performance.md#foundations-15-measurements-and-remaining-cost)                                                                                                       |

For item 9, implement a change only if it keeps the existing entity-map API and does not touch save or serialization code; otherwise record the design and stop.

**Excluded:**

- The EPR05 checklist item "hold paid wakeups until their required input evidence is durably available". The saves agent will provide a "durably saved" signal. This work leaves a documented seam for it (an eligibility predicate on the intake).
- Wiring action and invention results into the intake (AG07). The actions agent keeps the current path; this work documents the intake API seam.
- Status effects and sleepers, plus temporal, motion, flight and navigation code (time agent).
- Save and checkpoint code (saves agent).
- Client UI.

**Files this task owns:**

- `packages/domain/src/{events,experience,perception,draft}.ts`
- the perception parts of the spatial code: `encounter-cache.ts`, `object-exposure.ts`, `perception-frame.ts`, `event-audience.ts`, the perception snapshot in `entity-index.ts`
- `apps/server/src/{actor-work,interests,cognition-maintenance}.ts`

**Shared files, kept to minimal edits and listed in the handoff:**

- `packages/domain/src/kernel.ts` (the actions and time agents also edit it)
- `apps/server/src/ai-director.ts` (the invention branch edits it)
- Small seams only where the owner is named: `story-selection.ts`, `god-tools.ts`, `world-modules.ts`, `worlds/base/senses.ts`, `types.ts`, `index.ts`, `scripts/profile-native.ts`

**Never edited:** the invention-owned and shadow-owned files listed in the task.

## Findings that shape the plan

These come from reading `be68b1e0` and profiling it on this host; the evidence is in the verification report.

- **Native CPU:** on the seed-73 workload, about 18% of native CPU goes to whole-entity Immer `current()` snapshots in the encounter phase. The call is `worldRootEntities(world, true)`, and every root is also read through the draft, which creates proxies. Another ~18% goes to Immer finalizing the step draft.
- **The PF03/09 "24%" figure** was measured at `c1330009`. `ce7ef555` and current `main` now simulate different worlds: 344 vs 376 entities, and a different sighting policy. Identical-outcome proofs are therefore before/after on `be68b1e0`; `ce7ef555` is CPU context only.
- **Scheduler:** every server tick still recomputes a spatial visibility query for every character with a mind before checking eligibility. The EPR05 items claiming otherwise are overclaimed.
  - The watermark of evidence a character has considered advances when a thought is _admitted_ and when a sleeping character is _skipped_. That treats evidence as consumed when it has only been attempted or deferred.
  - Candidates are taken in map insertion order before the 64-read cap. A ticket whose inspection keeps failing therefore stays at the front of the order.
- **Leaving view:** records nothing. The one-hour re-sighting check reads `world.memories`, but sightings now live in awareness entries, so every return of a person creates a new record.
- **Story selector:** it expects `acquisition === 'visual'`, but the sighting emitter writes `true`. As a result, a character's own designated introduction never reaches the story selector.
- **No system-only scope exists.** The creator control notice `god-cognition-enabled` is currently emitted as an external event, so nearby characters record it as something they saw.
- **Reservoir attribute concerns** emit private awareness entries without checking whether the character can notice, including while it is asleep.
- **Creator writers:** the creator "edit person" health write skips body reconciliation, and creator spawn does not run the condition detector.

## Implementation sequence

1. **EPR00 — baseline and counters.**
   - Add a process-local, never-saved domain counter hook that game logic never reads. It counts:
     - full root traversals
     - spatial candidate builds and candidates
     - exact sense tests
     - observers examined vs skipped
     - event-audience candidates
     - awareness entries written
     - exposure deltas
   - Extend `scripts/profile-native.ts` with the counters. Add an opt-in per-step differential trace that hashes outcomes, events with audiences, RNG/ID/sequence, and awareness per character, computed outside the timed loop.
   - Add server intake statistics: ready count, cap overflow, failed inspections, oldest waiting age, evidence read and opportunity outcomes. Publish them through the existing bounded metrics as aggregates only; per-cause wake counts stay in local statistics because of the metric cap.
   - Record the current threshold/policy inventory and the save/restore invalidation hooks.
2. **PF03/09 — native CPU.** Every change here must be behavior-preserving.
   - Take one `current()` snapshot of the entity map instead of a proxy plus `current()` per root.
   - Avoid other read-only draft proxy scans on hot paths.
   - Remove redundant per-root allocations in the encounter phase.
   - Prove identical outcomes, RNG and audiences with the differential trace on matched runs.
3. **EPR01 — scope and intake metadata.**
   - Close the scope union: `external | private | system`. System events get no audience and no awareness entries, and never become story candidates. Mark creator control notices as system.
   - Define typed intake metadata in `actor-work.ts`: reason, source/episode, order, urgency, sim/wall due, disposition, and the authority generation (the existing scope).
   - Clamp creator-edited awareness importance to the record's valid range.
   - Fix the story-selector acquisition check.
4. **EPR03 — exposure deltas.**
   - Emit an observer-private departure record when a person with memory leaves view, using the base-world sighting policy.
   - Make the one-hour re-sighting coalescing read awareness entries, so boundary jitter creates at most one arrival and one departure per window.
   - Publish a per-observer exposure change (membership, and a visible object's position or appearance) that the server uses as its visibility change feed.
   - Reappraise visible candidates when the goal, knowledge or mind changes.
5. **EPR05 — one intake.**
   - Tickets carry typed reasons, first-wake time, urgency and due times.
   - Refresh compares cheap per-character tokens. Only characters whose own observed membership, position or dependencies changed recompute visibility.
   - Select up to 64 tickets by priority: interactive, then urgent, then longest waiting, so no ticket can pin the head of the queue.
   - Keep attempted and consumed evidence distinct. A native skip, such as a sleeping character, no longer consumes evidence.
   - Record directed speech as an intake cause; the durable chat-job lookup keeps the same speech from also producing an autonomous admission.
   - Keep the single shared execution slot: no concurrency or spending increase.
   - Add the documented durability-hold seam.
6. **EPR04 — remaining writers.**
   - Creator "edit person" health goes through body reconciliation; spawn runs the condition detector, which is the first opportunity for a newly created hungry character.
   - Reservoir concerns respect whether the character can notice, including sleep, without delaying native protection.
   - Scheduling carries the condition episode revision and policy version.
7. **EPR06 — persistent stimuli.**
   - A bounded, deterministic list of current salient exposures, derived from current state rather than new records. It separates physical salience, relevance, novelty and urgency, and reports how many cues were left out.
   - Optional due-review policies feed intake deadlines on the simulation clock. The base world keeps its current cadence and forces nothing into context; a test policy exercises the mechanism.
8. **Dense qualification.** Re-measure the 344-entity first-sight burst and denser crowds with per-phase counters. Implement target-only rescans when an affected observer must rescan (PF12.3) if the measurements justify it. Record PF12.4 acoustic reuse status with evidence.
9. **PF08.** Measure the alternatives:
   - freeze only the changed entities;
   - remove nested drafts;
   - let caches trust unfrozen published maps;
   - sharded maps;
   - a separate lot map;
   - `Map`.

   Implement only API-preserving, save-code-free options that show measured benefit. Write up the rest.

## Decisions

- **Departure records.** A person with memory leaving view creates private evidence at the same base-world profile as arriving: importance 3, urgency 0, no automatic reasoning. Animals and objects stay unrecorded under the September 27 policy. The contract names leaving view as a change a character notices, and this keeps it cheap and private.
- **Re-sighting coalescing.** The intended one-hour window is restored by reading awareness entries: at most one recorded arrival and departure per person per window. This intentionally reduces duplicate records.
- **System scope.** Control and diagnostic notices can no longer become character evidence. This is an intentional scope correction, not an optimization.
- **Concurrency.** Fairness is solved inside the current single shared slot. Raising concurrency changes spending and needs separate approval.
- **Considered evidence.** "Attempted" and "consumed" are separate records. A failed or skipped opportunity keeps its evidence available but does not retry the same opportunity automatically. No paid retry is introduced.
- **Unchanged pending owner decisions:**
  - condition policies for health and energy (BW07/D54);
  - how corpses and remains are sensed;
  - waking a sleeper for starvation;
  - production reminder cadence;
  - cue types that force context inclusion;
  - raising concurrency.
- **Tests.** Following the root verification policy, no new automated suites. The EPR test cases listed in the tracker are exercised with focused existing tests and small ad-hoc native/server scenarios. Deferred automated cases are recorded in the maintainer TODO.

## Verification and completion

- **Native matched runs:** seed-73 `mixed.json`, `mixed-8x.json` and a dense crowded scene. Alternate baseline `be68b1e0` and candidate on the same input. Label timings as shared-host and never claim acceptance from them.
  - For optimization-only stages, final digests and per-step traces must match exactly.
  - For intentional semantic stages, record the expected differences.
- **Server scenarios:** disposable PostgreSQL, `AI_BUDGET_USD=0`, no provider credentials. Exercise:
  - intake order and fairness;
  - no lost or duplicated wake-ups;
  - directed speech without a duplicate autonomous opportunity;
  - sleep skip that does not consume evidence.
- **Static checks:** pinned Prettier on changed files, `pnpm typecheck`, and focused existing domain tests.
- **Done:** every scoped item is either implemented, or recorded as not achieved with evidence. Measured CPU and burst results, with their limits, are in [the verification report](../verification/perception-reaction-intake.md). Trackers, limits, architecture and changelog are reconciled. Required review is complete.

## Progress

- [x] Context read; baseline measured; plan written.
- [x] Stage 1 — EPR00: counters, trace, baseline, threshold inventory.
- [x] Stage 2 — PF03/09: read-only root views, capture cache, freeze; identical digests.
- [x] Stage 3 — EPR01: system scope, intake types, story gate, importance bound.
- [x] Stage 4 — EPR03: departures, re-record window, episode linger.
- [x] Stage 5 — EPR05: fair change-fed intake, attempted/consumed cursor, speech ownership.
- [x] Stage 6 — EPR04: creator edits/spawn, reservoir sleep gating, version retraction.
- [x] Stage 7 — EPR06: derived bounded stimuli, attention salience, optional review cadence.
- [x] Stage 8 — dense qualification measured; per-record burst overhead cut; target-only rescans deferred with evidence.
- [x] Stage 9 — PF08: write-set freeze implemented; sharding/lot separation recorded as designs.
- [x] Documentation reconciliation and final review (two adversarial review passes; findings fixed or recorded as limits).
- [x] Rebased onto local `main` (`9ce4b7ad`) on 2026-10-01. Main's features took precedence in shared files. The branch's cognition limits were renumbered CG10/CG11, because main already used CG06–CG09. Main's saves work now reports durability; the EPR05 hold is the open item that wires `ActorWork.durable` to it and clamps the stored considered-evidence cursor to the saved cut.
