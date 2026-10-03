# Work proportional to what a moment affects

**Status:** proposed plan, not approved for implementation. The stages below are proposed work in order; nothing in them is implemented yet. It is meant to be picked up after the [regional work](regional-time-and-navigation.md) merges into main, and implementation starts only with Mike's go-ahead. The decisions at the end are engineering judgments with their reasons. Requested by Mike in chat on 2026-09-29 as the general follow-up to the [regional time and navigation work](regional-time-and-navigation.md). The documents that define current behavior stay authoritative: [simulation time](../simulation-time.md), [base-world time](../worlds/base/time.md), and the [boundary catalogue](../maintainers/simulation-boundaries.md), which is the maintainers' table of every kind of moment that can end a step. The trackers are linked from each stage.

## How time advances today

- **Stop and step.** The simulation keeps one clock for the whole world. It calculates in advance the next moment anything needs attention, jumps the clock there and does bookkeeping. In this plan that moment is a **stop**, and the time between two stops is a **step**.
- **Forecast.** At some stops the simulation also makes a **forecast**: every entity's current rate of change (how fast hunger, energy or fire fuel change) and the earliest moment any rule needs attention. Some stops only end the step and keep the forecast, for example a flying bird's mid-air turn or each metre it travels. Other stops throw the forecast away. Then every value is brought up to date, every status is re-checked and the forecast is rebuilt for the whole world. Stops of this second kind are called **shared** stops below.
- **The 1 m sensing rule.** A moving body's step ends after it travels 1 m (less near creatures with very short senses), so that who-sees-whom is re-checked often enough. This is a bundled-world fidelity rule. Other rules reuse the same value: when a bird waiting for a blocked landing spot tries again, and when an animal's small wander hop ends a step.
- **Postponement.** Since the regional work, a step in which bodies only moved does not apply hunger, energy or similar changes to anyone. It records the elapsed time, and the next stop that needs current values applies it.
- **Calls, batches and publication.** The server does not run the clock continuously. Every 50 ms its timer works out how much game time is owed and asks the simulation to advance; each such request is a **call**.
  - The server asks every call to end at the first shared stop. A call also ends when the offered game time runs out, after 32 steps, or at the first step end after about 8 ms of real work.
  - A single long step is never cut short. When one step takes longer than 8 ms, every step ends its own call.
  - Each call ends with **publication**: postponed changes are applied, and the edited working copy becomes a new read-only ("frozen") world that the rest of the server may read.
  - The server keeps making calls for about 8 ms (a **server batch**), then shows players the latest world, at most 20 times a second, and saves once per real second.
  - **Call size** is how much game time each call is offered (for example 30 s or 1 s).

## Goal and principle

Almost every stop costs work proportional to the size of the world, even when it concerns one bird. Fixing that one case at a time does not scale, as happened when the regional work fixed birds' mid-air turns. This plan adopts one principle:

> **The work done at a stop must be proportional to what that stop can change, not to the size of the world.**

Three rules follow:

1. **Every kind of stop declares its reach.** Reach says whose values must be brought up to date and whose forecast must be rebuilt at that stop:
   - **Private:** nobody's; the stop only ends the step. Examples are a bird's mid-air turn or each metre a moving body travels.
   - **Local:** only named entities whose rates or active statuses change, such as a bird taking off or landing, or an animal whose flee ended.
   - **Shared (everyone):** only as a fallback while the code cannot yet name who depends on the stop. Each such case is a gap to close, not a design; the goal is that no stop needs it. A new mechanic may use it only with a stated reason, recorded in the boundary catalogue.

   Sight is a separate question with the same answer. When something moves or changes, only the characters who could perceive it need their sight re-checked (rule 2). Today the sight bookkeeping walks the whole world at every stop, even one that concerns a single bird; stage 2 fixes that.

2. **Bookkeeping visits only what changed or could be affected.** Sight checks, value updates and publication are driven by a list of what changed in the step, not by walking every entity.
3. **Outcomes do not change.** Each stage is compared with the code before it on every benchmark scenario, once for each call size: 30 s calls like the server's, 1 s calls and one call for the whole run. "The same" means all of these match:
   - final positions, supports, timers, needs, attributes, status activity and saved random-number state, compared to six decimal places;
   - the sequence of events and the set of characters who witnessed each event;
   - each character's awareness records and memories, compared by content. The save format treats some records as unordered, such as each character's record of what it currently sees, so order is ignored. The regional work compared only record counts, so this is a new, stricter check. A hash of the whole saved world is not a valid check, because stage 2 changes the order of those records without changing their meaning.

   Some outcomes already depend on where steps end, on main and with the regional work ([regional evidence](../verification/regional-time-and-navigation.md#remaining-limits-and-gaps)):
   - A character approaching a target (to strike, hunt, gather, cook or pick up) notices it is within reach only at a step end, and what it sees on the way is also sampled at step ends.
   - A bird refused a landing spot tries again from where its last step began.
   - A lethal hit can be resolved before the victim's hunger for that step is applied.

   A stage that moves where steps end must list its expected shifts in these, and any floating-point residue from applying values over different spans, in its evidence before implementation; decision 5 makes the most important of them exact. It must not make any other outcome depend on call size. Any other difference needs Mike's approval as a documented fidelity change.

## Where the time goes today

These figures come from a disposable, timed copy of the regional branch at `563d0776`, before that branch was rebased onto main on 2026-10-01. The machine was a 10-core computer shared with other agents, running 6 to 17 times more work than it had cores (load averages 61–175). Absolute times are therefore inflated and noisy; compare the shares and counts, not the milliseconds.

The **bird flock** scenario is called "staggered flight" in the [regional evidence](../verification/regional-time-and-navigation.md#environment-and-method). It has 854 entities: about 60 people (62 characters that see and remember), 100 deer, 48 birds that take off at staggered times, about 500 inert objects and the starter world. Animals and birds are seen but keep no sight records. Over 300 game seconds it needed 73 steps of about 80 ms each, one step per call, and the table shows the range over 9 runs.

| Part of each step                                                                                                                                                                                                        | Share of time |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| Re-checking what every character sees and remembers seeing                                                                                                                                                               | 38–41%        |
| Finishing each call before the world is handed over: applying postponed hunger/energy changes (about 7%) and building the new world copy (about 15%). Freezing, sending to players' screens and saving are not included. | 22–25%        |
| Predicting the next stop, including the check that guarantees brief sightings are not skipped (about 20%)                                                                                                                | 21.5–23%      |
| Moving bodies                                                                                                                                                                                                            | 5–7%          |
| Start-of-step checks                                                                                                                                                                                                     | 4.6–5.6%      |
| Applying hunger, energy and similar changes at step ends (the catch-up before publication is in the second row)                                                                                                          | 1.5–1.8%      |

What stands out:

- **Rebuilding "what I currently see" records.** Each character keeps one record of every person and object it currently sees: about 555 entries here, each with a sighting ID that its memories refer to. When one entry changes, the whole record is rebuilt from scratch. That single operation is **18%** of all time, and its cost grows faster than the record.
  - In a second test that added 1,000 objects that never move, each record grew from about 525 to about 1,270 entries (2.4 times). Time spent rebuilding grew from about 1.1 s to about 3.8 s (3.4 times), from 17% to 33% of all CPU.
  - Total CPU rose 73%. The rebuild accounted for just over half of that rise, and publishing the larger world for much of the rest. These were single runs.
- **Everyone re-checks everything.** Whenever anything near a character moved, the character goes through every living thing in range again. 96% of characters did so every step: about 12,700 checks per step, while only about 32 bodies moved.
  - Most of those checks reuse an answer remembered from an earlier step, because neither body had moved. Only about 1,800–1,900 pairs per step involved a moving body and needed a fresh line-of-sight test.
  - The only map is 28 × 24 m and characters see 28 m, so in today's scenarios everything is always near everything. They cannot show whether work stays local on a larger map.
- **Publication rewrites everyone.** Each call's publication recorded about 1,800 field changes across all 215 entities with changing values.
  - About 1,430 of them (80%) come from one bundled-world rule, energy use while awake. For each of the 214 awake characters it rewrites the energy value, its change counter and the rule's running time, about 640 changes in total.
  - The same rule also changes about 790 counters across 214 **work-accounting records**. That system limits how much rule work each status effect may do: 1,024 evaluations per game second ([NW05](../limits/native-work.md#nw05)).
  - The pass that builds the new world copy from the edited working copy took 13–15% of all time. It follows both these changes and the world's size, because it visits every entry of the world's entity table even when only a few changed. The measurements did not separate the two parts.
- **Postponement saves nothing yet in dense scenes.** Each of the flock's 67 body-only steps ended its own call, so its postponed changes were applied at that same call's publication (7.4% of time).
  - In the flock, the regional speed-up came from fewer steps (204 → 73), not from postponement.
  - In the lighter 100-sleeping-deer scenario, steps barely changed (27 → 26). There, cheaper steps often let two share one call and one publication (27 → 18 calls), which is where postponement already pays off.
- **The brief-sighting guarantee is expensive where it never fires.** The check that makes sure no step jumps over a short sighting or touch cost about 20% of time in the flock (19.4–20.5% across nine runs), and it ended no step there. It does catch sightings in other scenarios, such as a person glimpsed through a wall slit. So it must stay, but its cost must follow the pairs that can actually change.
- **One bird's takeoff costs a full step.** 48 of the 73 steps were a single perched bird taking off; those calls took about 65% of the time. Takeoffs remain stops, so stages 2, 3, 5 and 6 are what make each such step's bookkeeping follow what the takeoff changed.
- **A 60-second safety limit re-forecasts everyone when nothing is due.** The forecast never looks more than 60 game seconds ahead (a bundled-world setting). Reaching that limit is a shared stop at which nothing happens. It caused every full re-forecast in both scenarios: 5 of the 73 flock steps and 5 of the 26 sleeper steps.
- **Walking characters stop everyone.** For a walker, both its 1 m sensing stops and each point on its route are shared stops. For a character carrying out a `move` command, nothing at those points changes anyone else's rules or rates:
  - the movement code already walks through several route points in one go;
  - no rule depends on the surface under a walker;
  - no event is emitted;
  - its sightings and arrival are calculated exactly.

  The 1 m stop exists only so that sight is re-checked, which can happen at a private stop, as it already does for birds. Stopping at route points was part of the original time design, when every stop was shared. When birds, falling bodies and fleeing or wandering animals got private stops, walkers stayed shared under a deliberate cautious default for movement that change had not examined ("Unknown mechanics keep existing shared bounds", [cadence integration plan](spatial-cadence-main-integration.md#motion-deadline-implementation-decision)). No walker-specific reason was recorded, and this analysis finds none.

  In a small test, four walkers on straight routes needed 14 calls over 120 game seconds, against 4 with no walkers. The same walks with extra route points along the same lines needed 33 calls and about 3.3 times the CPU (3.5 s against 1.1 s).

**Sources.** These figures come from throwaway timing scripts and notes kept outside the repository while this plan was written, and they cannot be rerun as they stand. The method: the real simulation step was driven the way the server drives it, with at most 30 game seconds offered per call and a request to stop after 8 ms of work, so each call advanced one step. The world was first warmed to game time 60, and each part of the step was timed separately. In every run, the final state, the events and who witnessed them matched the documented values and an untimed run. Stage 0 re-measures every figure with committed scripts. Until then, no stage's expected saving counts as established.

## Owners

- The **time agent** did the regional work (`codex/time-nav-performance`, ready to merge into main on 2026-10-01). It owns stepping and forecasting, movement, flight, statuses and route finding.
- The **perception agent** owns sight, events, memories and the code that builds each published world. Its sight-and-reaction work merged into main on 2026-10-01 (`4c67ed33`), after the measurements below; the regional branch was rebased over it the same day.
- The **saves agent** owns saving; its work is merged on main.
- The main simulation loop (`kernel.ts`) is edited by the time, actions and perception agents.
- The shared-campfire and composed-activities work changed the same forecasting code and main loop; both are on main, and the regional branch was rebased over them on 2026-10-01.
- The [survival-settings plan](world-configured-survival.md) changes the same forecasting code. It removes the engine's named starving and exhausted conditions, which stage 4 builds on.
- The server code that builds each player's view (`apps/server/src/view.ts`) has no named owner; four branches edit it.

## Stages

Each stage lists what changes, the expected effect, the main risks, how it is verified and the owner.

### Stage 0 — measure first

- **Counts, not clocks, inside the simulation.** Add a permanent, optional count of the work each step does: entities copied, sight candidates checked, fresh line-of-sight tests, records rewritten, and separately the entity-table entries copied and checked when each new world is built.
  - Reuse the work counters main gained with the perception work (`packages/domain/src/diagnostic-counters.ts`: sight tests and cache hits, observers examined and skipped, sighting records, spatial queries) and the per-step outcome digests and crowd scenarios it added to `scripts/profile-native.ts`.
  - The simulation code only counts. It never reads a clock, because the [project boundaries](../../AGENTS.md#boundaries) and [simulation time](../simulation-time.md#host-and-persistence) forbid that.
  - Time per part of the step is measured outside the simulation, with the CPU profile `scripts/profile-native.ts` already records, or with a timing hook installed by that script. Nothing the hook records is saved or read back, so enabling it cannot change outcomes.
- **Server timings.** Time building, freezing and saving each published world, and count the calls in each server batch.
- **Committed scripts and scenarios.** The regional versions were throwaway files outside the repository. Commit to `scripts/performance/` as run-on-demand scripts, like the existing ones there, not automated tests:
  - a driver that advances the world the way the server does;
  - the bird flock and the 100 sleeping deer;
  - the eleven outcome-comparison scenarios from the regional work, each with 30 s, 1 s and whole-run calls;
  - the wall-slit, brush-past, hovering-bird and held-landing checks, and the brute-force sight-geometry check;
  - the outcome comparison defined in rule 3.
- **Scenarios that can show locality:**
  - a map several times larger than the 28 m sight range, with separated groups and birds;
  - characters walking real multi-point routes produced by the route-finding worker.
- **Baseline.** Record a baseline in a new report under `docs/verification/`, linked from the verification index and from this plan, with raw results beside it. Measure it on the current main when stage 0 starts (decision 4). Later stages report savings against that baseline, not against the figures above.
- **Owner:** time agent.

### Stage 1 — stops declare their reach

This stage keeps each call size's outcomes the same except for the listed shifts (decision 5). Step ends move, and the canonical documents change wording.

- **Reach in the catalogue.** Add a reach column to the boundary catalogue and mark each kind of stop in the code as private, local or shared.
- **Walkers become private movers.** A walker's 1 m sensing stops and intermediate route points stop being shared stops, as flying, fleeing and falling bodies' 1 m stops and mid-air turns already are. Later route points are walked inside one step, like mid-air bird turns.
  - Arrival stays a shared stop. Finishing a walk announces a "moved" event that nearby characters can witness, and it completes the walker's current plan step.
  - **Reaching a target is calculated, not sampled (decision 5).** A character walking up to something to strike, gather, cook or pick up currently notices it is within reach only at the next pause. This stage calculates the moment it comes within reach, as walk arrival and brief sightings already are; a moving target (an animal running) uses the same predicted paths as the brief-sighting check.
  - Characters following a moving target keep today's behavior. They recompute their route on a timer the forecast does not know about, and can join once that timer becomes one of the moments the forecast tracks.
- **Local re-forecasts for single-entity changes.** Today each of these rebuilds everyone's forecast:
  - a flee ending;
  - work starting when a character reaches its target;
  - a creature crossing one of its own hunger, energy or condition levels;
  - a condition review, the periodic check that tells a character how its body feels;
  - a promise to another character becoming overdue.

  They will instead re-forecast only the affected entity, using the shortcut birds already use when they take off or land. That shortcut applies only when no other entity's status refers to the entity and it is not starving, exhausted or sharing a supply; otherwise the whole forecast is rebuilt as today.

  The shortcut alone is not enough for characters. While a forecast is kept, the start of each step looks only at characters already expected to react (urgent needs, an active plan, following someone). The end-of-step check of body conditions is also skipped whenever changes are postponed. So a local stop must bring the affected character's values up to date and run its own checks at that moment. The rules that discard the whole forecast whenever any event or new record appears must learn to ignore events that concern only that character, as they already do for a bird's takeoff.

- **Hovering birds keep flying through their hover point.** Today, when a bird reaches a point where it hovers in mid-air, the movement code throws away the rest of the step, so arrival has to end it. Instead, the bird spends the rest of the step hovering, and flies on if the hover ends within the step.
- **The 60-second safety limit stays a shared stop.** Three other rules depend on it:
  - it keeps a wandering animal to at most one small hop per step, because the shortest wait between hops is 120 s;
  - it sets how far ahead the forecast looks for movement;
  - it sets how far ahead the forecast looks for brief sightings.

  Lengthening, removing or localizing it is outside this plan.

- **Documents updated in the same change.** Three canonical documents describe the mechanism being replaced, and each keeps its earlier reasons, with a [documentation changelog](../documentation-changelog.md) entry:
  - [simulation time](../simulation-time.md#native-interval-contract): which changes re-forecast only the affected entity, and that intermediate route points no longer end steps for everyone;
  - [base-world time](../worlds/base/time.md#spatial-fidelity): walkers join the private movers, and the 1 m rule itself does not change;
  - the catalogue's walking row.
- **Expected effect:** in the walking scenario, shared stops fall from roughly walkers × route points to about one per completed walk.
- **Risks:**
  - **Walker paths.** Predicting a walker's path beyond its next route point, including each segment that could be blocked.
  - **Moved step ends.** Walkers' stops leaving the shared forecast, and intermediate route points no longer ending steps, change step ends. That would change when characters approaching a target notice arrival, which is why this stage calculates that moment exactly (decision 5), and when a bird waiting for a blocked landing spot tries again, which gets its own timing (decision 2).
  - **Rounding.** Applying postponed values over longer spans can move threshold times by about 10⁻⁶ s.
  - **Delayed checks.** A local stop could skip or delay the affected character's own checks.
  - **Hovering birds.** The brief-sighting check must predict a hovering bird's approach, pause and departure within one step. The regional review already found a walker who never saw a hovering bird, because the path that brought the bird there was reused.
  - **Merge order.** The survival-settings work changes the same code, so overlaps are reconciled when it lands (decision 4).
- **Verified by:**
  - rule 3, with the regional scenario of a walker passing a hovering bird, including a variant where the hover ends partway through a step (none of the benchmark scenarios has a hover point);
  - a bird waiting for a blocked landing spot while someone walks a multi-point route nearby;
  - a character approaching a moving target while another walks such a route;
  - every expected shift listed for Mike before implementation.
- **Owner:** time agent, with small edits to the main simulation loop. Tracker: [PF13.11 (elapsed-time regional work)](../maintainers/simulation-time.md#pf13--elapsed-time-simulation).

### Stage 2 — sight work follows change

[PW08](next-playable-week/simulation-performance.md) implements only membership-difference updates, reverse incident-pair invalidation and dependency-certified certain-path reuse from stages 2–3. Its current matched evidence and remaining gates are recorded with that task. The change-list, target-only visibility, exact approach timing, horizon and other stages below remain proposed; the historical percentages are not current measurements.

This stage builds on the perception work merged into main on 2026-10-01, which reworked this code: the sight pass reads unchanged entities without copying them, records when a person leaves a character's view, and counts its own work. Stage 0 re-measures what remains before this stage claims further savings.

- **Update "what I currently see" records in place.** Add the entries that appeared and drop the ones that disappeared, keeping the same sighting ID for each sighting still going on, so memories that refer to it stay linked.
  - This removes the largest single cost (18%) and does not depend on other stages.
  - It changes the order of entries in each saved record. The save format already treats that order as meaningless, so outcome comparisons ignore it (rule 3).
- **A change list instead of whole-world comparisons.** Today no part of the step records what changed. After every step, the sight pass copies every entity's position, size, appearance and senses and compares each with the previous pass. The only other record of edited entities is made when a whole call finishes, after the sight pass, and it includes every creature whose hunger or energy was updated.
  - This stage builds a new list of the bodies whose sight-relevant properties changed during the step:
    - moved, landed or took off;
    - spawned or removed;
    - died or was incapacitated;
    - changed appearance (a fire lit or out, a resource used up);
    - changed senses (for example sleep blocking them).
  - Every code path that makes such changes must report them: movement and flight, actions, status effects, fuel and other changing values, spawning and removal, player commands and live world edits.
  - The sight pass then reads the list instead of comparing every entity, and keeps its map of where things are up to date from it.
  - A forgotten report would leave a character seeing something out of date, so a debug mode also runs the full comparison and fails on any difference.
- **Re-check only what changed.** A character that did not move re-tests only the targets that changed ([PF12.3, finer re-checks](../maintainers/performance.md#pf12--eight-times-spatial-and-sensory-execution)). The perception agent deferred this on its own crowd scene, where remembered answers covered 97% of checks. The flock and large-map scenarios decide whether it is worth doing.
- **One definition of the sight rule.** The rule is how far a character sees, from eye height, to three points on the other body. The perception code owns it, and the brief-sighting check imports it. Today the check keeps its own copy, which must be kept in step by hand.
- **Optional, joint: reuse the brief-sighting check's results.** The check already knows, for each moving pair, until when their sight cannot change. The sight pass may skip a pair on that basis only when the stored result was computed with:
  - the watcher's current sight range and eye height;
  - the target's current height;
  - the same map;
  - both sides still alive and taking part in the world;
  - the watcher's senses not blocked.

  It must also use a safety margin near the moment sight changes, and fall back to the exact test otherwise.

- **Expected effect:** per-step sight work follows the number of changed bodies and the characters near them, not the world's size.
- **Risks:** a missed change leaves a character seeing something stale. The order of sightings, who witnessed each event, and memories must match exactly.
- **Verified by:**
  - rule 3, including memories by content;
  - the debug full-scan comparison;
  - on the large map, adding a distant group or thousands of inert objects leaving the per-step sight counters roughly unchanged.
- **Owner:** perception agent ([EPR02, EPR03 and EPR10: sight scans, sight changes and spatial indexes](../maintainers/events-perception-and-reactions.md)). The time agent reports movement and flight changes; the owners of actions, status effects, spawning and commands report theirs.

### Stage 3 — the brief-sighting check costs what it protects

**How it works today.** Before each step, the check looks at every pair made of a watcher (a character that can see or feel touch) and a body near it, where at least one of the two is moving. For each pair it follows both predicted paths and works out the exact time spans during which the watcher can see or touch the other body. It then ends the step inside any span that would otherwise fall between two stops.

**Changes:**

- Store each pair's time spans under both bodies, and recompute only pairs that involve a body whose predicted path changed.
- Rule out pairs too far apart to come into sight or touch during the step with a cheap distance test, before comparing their paths.
- Today every shared stop throws away all stored spans. Keep a pair's spans across a shared stop only when neither path changed and everything else they were computed from is unchanged:
  - the watcher's sight range and eye height;
  - both bodies' size and reach (a body lies lower once dead);
  - whether each side is alive and taking part;
  - whether the watcher's senses are blocked;
  - the map.

  Store these with the spans, and discard the spans when any of them differs.

- Today, whenever any watcher is moving, the check builds a position lookup of every entity in the world. Build it only from bodies a moving watcher could reach, or keep it up to date from the change list.
- Find out why about 125 pairs are recomputed on every step of the flock.

**Expected effect:** most of the check's roughly 20% share in the flock.

**Risk:** over-pruning silently loses a brief sighting.

**Verified by:**

- the brute-force sight-geometry check, the wall-slit and brush-past scenarios, and rule 3;
- a scenario in which a watcher's sight range changes, and one in which a target dies, while a brief sighting or touch is predicted. Outcomes must match a run that recomputes every pair at every step.

**Owner:** time agent ([PF13.11](../maintainers/simulation-time.md#pf13--elapsed-time-simulation)).

### Stage 4 — values updated only where needed

- **Per-entity postponement.** A stop applies postponed changes only to the entities it touches, plus anything coupled to them, such as two characters drawing from one supply. Today one creature that is starving, exhausted or replenishing a supply turns postponement off for the whole world, because those cases' results depend on exactly when changes are applied. That switch becomes per entity. The engine also stops naming these bundled-world conditions itself: the world's rules tell the engine which of their conditions need immediate updates. The [survival-settings plan](world-configured-survival.md) does that last part first: postponement switches off only while a rule that changes health is active, a property of the rule rather than a named condition. This stage then makes the switch apply per entity.
- **Publishing without updating everyone (decision 1).**
  - Publish each changing value as "value at a given time plus its rate". Every reader then works out the current value from that: the game screen, AI context, saves and player commands.
  - This reverses the current rule that every value is brought up to date before a world is published.
  - It changes the save format, which the development save policy allows with no old-save support.
- **Work accounting only when it matters.** Today every hunger or energy update also rewrites that status's work-accounting record.
  - Charging once per one-second accounting period would not help. Publications are often a game second or more apart (in the sleepers scenario nearly all of them are), so most records would still be rewritten at most publications.
  - Instead, compute each status's charge from the elapsed time, and write it only when something reads it (a save, an inspection) or a limit check needs it.
  - The per-second limit is also a safety stop. It is what turned main's endless tiny steps into explicit errors: the flight run at 569.42 s and the feeding scenario after 1,038 calls ([evidence](../verification/regional-time-and-navigation.md)). Keep an equivalent stop, for example a cap on steps per game second for each status, and update [NW05](../limits/native-work.md#nw05).
- **Expected effect:**
  - Per-entity postponement saves work only at stops that are not published. In dense scenes today every step is published, so it saves nothing until decision 1 is carried out or until cheaper steps share a publication.
  - Bringing values up to date only on reading (decision 1) removes up to the 7.4% catch-up and part of the 13–15% spent building each new world in the flock; publication is 26–30% of the sleepers scenario. It also removes most of the roughly 1,800 changes per publication.
  - On-demand work accounting removes most of the roughly 790 counter changes per publication.
  - These are expectations, not measurements.
- **Risks:**
  - **Stale reads.** Anything that reads a value before its postponed time is applied gets a stale value: a player command, a strike, a sight check, AI context or a save. The regional review already hit this once, when a punch killed a character and dropped its last 18 s of hunger.
  - **Order and coupling.** Changes within one stop must keep today's order, and coupled entities must be brought up to date together.
  - **With decision 1**, every reader must use one shared way of reading values, or, for example, an AI prompt could describe a starving character as fed. Results must not depend on which readers ran.
  - **Work limits** must stay exact.
- **Verified by:**
  - rule 3, including the regional punch-and-hunger and work-on-arrival scenarios;
  - a debug mode that brings every value up to date at each stop and compares;
  - a constructed case that repeats tiny steps, such as main's refused-landing retry, still ending in an explicit work-limit error.
- **Owners:** time agent, with the status-effect and work-limit code owners (none named yet).

### Stage 5 — publication follows change

- **Freeze only what changed.** After each call, the server marks the new world read-only, so caches can trust that unchanged parts never change. Before the perception work it walked every entity to do that: 1.4–1.6 ms per call at about 4,000 entities in one measurement. Since 2026-10-01 main freezes only the entities changed since the previous published world; stage 0 checks that nothing remains here.
- **Remove whole-world scans from each server batch.** Four checks walk the whole world:
  - finding player-controlled characters;
  - counting entities;
  - checking whether anyone waits for a route;
  - checking for characters with too many unprocessed memories.

  Each should use a list kept up to date as entities change.

- **Players' views follow change.** Today each publication rebuilds the lookup of nearby entities from every entity, and every player's view is recomputed. The lookup should be updated from what changed, and a player's view recomputed only when something in their neighborhood changed. This code has no owner yet; the stage that changes it handles it (decision 4).
- **Split the world's single entity table into buckets (decision 3: not now).** Today every publication copies and visits the whole entity table even when one entity changed. The perception branch measured one change at 0.29 ms with 400 entities, 9.3 ms with 4,000 and 205 ms with 40,000.
  - With buckets, only changed buckets are copied and frozen. The cost then follows the size of the changed buckets; it still grows somewhat with the world (bigger or more buckets).
  - The work-accounting records need the same split.
  - About 440 places in the code look up one entity by ID, and roughly 120 more scan, copy or check the whole table; all of them would change, along with the save format.
  - Design only until approved.
- **Fewer publications per game second (decision 6).** Every shared stop ends a call and pays for its own publication, however cheap the step was. Private steps already share one call, up to 32 of them. Candidates:
  1. keep the forecast and the list of participating entities across calls that end at a shared stop;
  2. let one call run across shared stops until the 8 ms budget is used, since nothing outside the batch can see results in the middle of it;
  3. revisit the 32-step limit, already flagged for review in [RP06](../maintainers/revisitable-policies.md#rp06--elapsed-time-fidelity-and-integration-limits).
- **Expected effect:** freezing, per-batch scans and view rebuilding follow the number of changed entities; with the table split (decision 3), so does building each new world.
- **Risks:**
  - **Frozen-object caches.** Several caches trust only frozen objects: the forecast carried to the next call, the list of top-level entities, the nearby-entity lookup, the work-accounting allocation and the record of which entities changed. A new object left unfrozen silently disables them or lets a published world be edited.
  - **Missed route wait.** A missed "waiting for a route" entry would let game time pass while a route is still being computed.
  - **View correctness.** Views recomputed only on neighborhood change must not miss a player's own changes (status, inventory, messages), and must keep the rule that a player sees only what they may see.
  - **Longer calls.** These can shift the outcomes listed under rule 3.
- **Verified by:**
  - rule 3;
  - a development check that every published world is fully frozen;
  - comparing views against full recomputation;
  - stage 0's calls-per-batch count before any change to call length.
- **Owners:** perception agent (the code that builds each published world), saves agent (save format), time agent with the server-loop owner (call length). The player-view code has no owner yet. Trackers: [PF05, PF08 and PF12.7 (publication, resident state and pose updates)](../maintainers/performance.md).

### Stage 6 — per-step loops touch only active things

- **Visit only what is due or moving.** Store wander timers and bird perch waits as due times, and let each step visit only entities that are due or moving. Today several loops visit all 215 active people, deer, birds and the campfire on every step, while only about 32 move. They cost up to about 10% of flock time; part of that is real bird movement, which remains.
- **Replace the remaining whole-world loops** with kept sets of active entities: start-of-step checks, working characters, arrivals and plan waits.
- **Expected effect:** per-step loop work follows the number of active entities.
- **Risks:** the order in which animals take random numbers (by due time, then entity ID) and the order of simultaneous landings must stay exactly as today. The save format changes, which the development save policy allows.
- **Verified by:** rule 3, including the wander-order and landing scenarios.
- **Owner:** time agent.

## Responsiveness

Every stage also reports:

- the longest single call;
- the longest stretch the simulation runs without letting the server do anything else;
- calls per server batch;
- headroom at 3× and 8× game speed.

The server keeps other world changes, including player commands, waiting until its current batch ends. A batch ends at the first step end after about 8 ms, so a command waits behind the slowest single step.

The regional work already made individual calls longer, because each step covers more: the longest call went from 309–715 ms to 320–1,462 ms (the top figure during a load spike). If a stage makes a step or call slower beyond run-to-run variation, it must say why, and Mike must approve. [RP06](../maintainers/revisitable-policies.md#rp06--elapsed-time-fidelity-and-integration-limits) says changes to which stops are private must be judged by command latency and throughput together.

The standing targets are the [acceptance budgets](../maintainers/performance.md#acceptance-budgets): a player command's result is saved within 100 ms at p95, and at 8× no uninterrupted simulation run is longer than 8 ms.

## Decisions

These are engineering judgments, not questions for Mike: none changes what players see beyond the existing approximations described here, and each will be re-checked against stage 0's measurements.

1. **Bring values up to date only when someone reads them — later, if still needed.** Every creature has numbers that change continuously (food, energy, health while starving). Today, at the end of every round of simulation work, every such number is rewritten to its current value before the world is handed to the rest of the server: 215 creatures and about 1,800 changed fields per round in the bird test, roughly a fifth of the simulation's time. The alternative stores "energy was 84.2 at game time 10:03:15, falling 0.0005 per second" and works out the current value only when something reads it (the player's screen, a save, an AI prompt, a rule check). It saves that rewriting; the cost is that every piece of code that reads these numbers must go through one shared calculation, or it shows a stale value (an AI prompt could describe a starving character as fed), and the save format changes. Players would see nothing different. **Decision:** do the cheaper fixes in stages 1–3 first, then do this in stage 4 only if the rewriting is still one of the largest costs.
2. **Animals and birds nobody can see stop pausing every metre.** The simulation cannot check sight continuously, so it pauses the clock each time any moving body has moved 1 m and re-checks who can see whom. For an animal or bird that no character could see during that time, the pause is wasted. **Decision:** skip it for such bodies. This is not done for a moving character, because a character notices things around it. Two unrelated rules currently borrow the same 1 m timing — how often a bird retries a landing spot that is occupied, and when an animal's small random wander hop may end a pause — so each gets its own timing setting first.
3. **Do not split the world's entity table yet.** Everything in the world — every person, animal, bird, tree, rock, item and fire — is an entry in one table keyed by its ID (854 entries in the bird test). When a round of simulation ends, the game makes a new read-only copy of the world so the screen, saving and AI can read a stable version while the simulation continues. Unchanged entries are shared, not duplicated, but the table of IDs itself is copied and checked in full whenever anything changed. Measured cost of copying it with one changed entry: about 0.3 ms with 400 entries, 9 ms with 4,000 and 205 ms with 40,000. Splitting it into, say, 256 smaller tables would make that copy cost about the same however many entities exist, but it changes about 560 places in the code and the save format. **Decision:** not now; revisit if a world approaches about 5,000 entities or stage 0 shows this copy among the largest costs.
4. **Other work in progress is reconciled when it lands.** Several other agents are changing the same files on their own git branches (inventions, survival settings; sight and memory, campfire sharing and composed activities have since merged). Whichever lands later must adapt to the others; nobody needs to decide the order in advance. Each stage starts from the current main and reconciles overlaps at that point. Code without an owner (the server code that builds each player's view) is handled by whichever stage changes it.
5. **Make "reached its target" exact instead of accepting timing shifts.** A few things are only checked when the simulation pauses the clock, so they happen at the first pause after the real moment: a character walking up to something to strike, gather or pick up notices it is within reach, and a bird whose landing spot is occupied tries again. Removing unnecessary pauses moves those moments by up to the time it takes to walk about 1 m (around 9 game seconds at walking pace); the same punch already lands at 129.3 s or 126.9 s of game time today, depending only on how the server split time. **Decision:** stage 1 calculates the moment a character comes within reach of its target, the way walk arrival and brief sightings are already calculated, so that moment no longer depends on pauses at all; landing retries get their own timing (decision 2). Remaining differences within the existing 1 m approximation are recorded in each stage's evidence.
6. **Player commands must not wait longer.** The server runs the simulation in short rounds of about 8 ms of computer work, then handles player commands, screen updates and saving; a command arriving mid-round waits for the round to end. Each round ends by handing the new world to the rest of the server, which costs work. Several pauses can share one hand-over only while the round stays within its 8 ms of work, so commands wait no longer than today. **Decision:** combine hand-overs only inside that existing 8 ms limit. The real waiting problem is a single slow pause: in the dense bird test one pause took about 80 ms on a busy machine, and up to 1.4 s during a load spike, because one pause cannot be split. Stages 2–3 make those pauses cheaper; every stage reports the longest wait.

## Order, verification and completion

- **Order:** stage 0 first; then stages 1 and 3 (time agent) alongside stage 2 (perception agent); then stage 4 (decision 1); then 5 and 6.
- **Every stage:** rule 3 on the bird flock, sleepers, walkers and large-map scenarios, for each call size; the regional scenario checks still pass; the responsiveness report above; timings run back to back against the previous stage on the same input and labeled as shared-host observations.
- **Complete when**, in the large-map scenario with the same outcomes:
  - adding a distant group or thousands of inert objects leaves stage 0's per-step counters (entities copied, sight checks, records rewritten) unchanged within about 10%;
  - doubling the number of moving bodies roughly doubles them.

  Two exceptions are reported separately:
  - building each published world, which keeps growing with the entity count unless the table split (decision 3) is built;
  - the full re-forecast at the 60-second safety limit.

  In addition:
  - every kind of stop in the catalogue has a declared reach;
  - decisions 1–6 are re-checked against stage 0's measurements;
  - the final stage reports 3× and 8× headroom and the longest call on the bird flock and the large map.

## Not proposed

- separate clocks or worker threads per region;
- freezing offscreen regions;
- loosening sight fidelity beyond decision 2.

The contracts in [simulation time](../simulation-time.md) stay:

- one clock for the whole world;
- what a character perceives is recorded when it happens;
- every character near a moving body is checked at each stop;
- random choices come from a saved sequence, so reloading repeats them;
- engine code stays separate from the bundled world's rules.
