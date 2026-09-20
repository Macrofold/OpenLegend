# Time, acceleration, and survival

Status: **accepted timing scheme and implemented personal-world controls**, updated September 19, 2026. The user's latest instruction supersedes the earlier candidate of one real hour per game day: **1× now advances one simulated minute per real second**. The running prototype has 0.5×, 1×, 3× and 8× plus a saved **Pause game when hidden** checkbox in the time-controls settings panel. Larger aging, weather, sector and overload systems below remain design proposals. See [implemented architecture](../../docs/architecture.md) and [verification](../../docs/verification.md).

The checkbox is on by default. When checked, a hidden or unfocused tab pauses the personal world; when unchecked, connected background play continues, including ordinary autonomous scheduling under existing AI caps. Manual pause always wins. Closing all connections, server downtime and computer sleep do not authorize offline catch-up. Live NPC cognition and conversation remain required acceptance work; native execution remains the per-action foundation and outage behavior. See [first playable MVP](../05-project/first-playable-mvp.md).

## What time should mean

The starting population consists of people with some survival knowledge, accessible resources, and possessions in a primitive wilderness setting. They have no established village. Hunger, thirst, exhaustion, exposure, mistakes, and death should have real consequences; keeping every NPC alive is not the success criterion.

Keep familiar simulated units: seconds, hours, days, and years. Compress their relationship to real time instead of redefining an hour to mean a day. A character can therefore sleep eight simulated hours, describe meeting tomorrow, or remember something last winter without each system inventing a different calendar.

Use one authoritative simulation timestamp, stored in integer units fine enough for movement and timed effects. A calendar projects that timestamp into days and dates. Work duration, need depletion, regrowth, weather transitions, healing, and ordinary chronological aging refer to this clock. Difficulty comes from these systems and starting conditions; speed changes how quickly the observer sees their consequences.

## Base rate and creator controls

Let `B = 60` simulated seconds per real second and let `M` be the creator's selected speed multiplier. While running, simulated elapsed time is `real elapsed time × B × M`. Pausing makes advancement zero. The interface should show both forms, such as **1× · 1 game minute/real second · 1 day/24 real minutes**, so “1×” does not ambiguously mean real-time simulation.

Implemented presets, assuming a 365-day simulated year for the illustrative year column:

| Setting | Effective simulated seconds per real second | Real time per simulated day | Real time per simulated year |
|---|---:|---:|---:|
| Paused | 0 | Does not advance | Does not advance |
| 0.5× | 30 | 48 minutes | 12 days, 4 hours |
| 1× | 60 | 24 minutes | 6 days, 2 hours |
| 3× | 180 | 8 minutes | 2 days, 40 minutes |
| 8× | 480 | 3 minutes | 18 hours, 15 minutes |

These are the current presets; larger multipliers require explicit admission and load testing. The creator can request a speed change at any point through the separate god/admin controls. Apply it at an explicit authoritative boundary and journal the old rate, new rate, simulation timestamp, command ID, and actor. Integrate time before that boundary at the old rate and time after it at the new rate. Never rescale elapsed work retroactively.

Pause freezes needs, movement, aging, environment, action progress, scheduled world outcomes and autonomous AI scheduling. Rendering, inspection, menus, networking and wall-clock provider timeouts may continue. Cancel unnecessary pending work where supported; already-dispatched requests may still finish and incur usage. The current prototype discards results canceled by pause; it does not silently apply them on resume. Explicitly requested conversation or creator editing while paused has a separate visible policy; such interactions do not silently resume world time.

## Survival, work, and timed effects

Define depletion and production with units: nourishment per simulated hour, gathered material per work-hour, and fuel per burn-hour. Work records track required effort, completed effort, participants, tools, interruptions, and consumed inputs. Elapsed time alone does not finish a shelter when its builder is asleep or its wood is missing.

Known gathering, eating, drinking, resting, carrying, shelter use, and immediate hazard responses should run through authored mechanics and deterministic controllers. Models can choose goals or interpret unusual situations without being required for every bite or step. Learning to survive can include failed plans and deaths while already-known survival actions remain executable during provider delays.

Process important boundaries in order. If food runs out halfway through a rest period, later healing cannot assume a full night's nutrition. If a worker becomes incapacitated before completion, the project stops at that point. Timed effects specify start, end or stopping condition, rate, modifiers, next boundary, and last integrated time. Resource accounting and threshold transitions must agree at every speed.

## Aging and generations

The initial comparison should use **uniform time**: one simulated day advances both the calendar and ordinary chronological age by one day. This directly follows the user's suggestion to accelerate work, needs, environment, and aging together. Existing adults need not start at age zero; birth timestamps can precede the scenario's starting date.

At the 60:1 base rate, reaching age eighteen from birth takes 2,628 real hours: **109 days and 12 hours** with uninterrupted running and 365-day years. At 8× it takes 328.5 real hours: **13 days, 16 hours, 30 minutes**. A fast daily loop therefore does not automatically create a fast generational game.

Keep an independent lifecycle coefficient as an **open option**, not an adopted rule. Increasing it would separate biological development from calendar age and require explicit treatment of maturation, pregnancy, frailty, memories, and family relationships. Alternatives include shorter fictional years or deliberate long-range time jumps. Compare them only after deciding how soon the creator should observe generations and how human characters participate; do not silently multiply aging alone.

## Conversation, sleep, and human attention

At 1× (60:1), a five-second model response consumes five simulated minutes; a two-minute human conversation spans two simulated hours. Eight simulated hours of sleep take eight real minutes. At 8×, the same sleep takes one real minute, while five seconds of inference spans forty simulated minutes. These are material design consequences, not just interface details.

NPCs need plans that remain useful for meaningful simulated intervals. Batch routine work and reserve model calls for decisions, conversation, and novel interactions. A pending conversation should not monopolize a starving character indefinitely; authored interruption and urgent-action rules still apply.

Human input, readable speech, and reaction windows operate in real seconds. Animation can interpolate authoritative movement, but interpolation cannot make arbitrarily accelerated travel readable. Tune map distances and ordinary movement against the base rate, then test higher rates separately. Possible policies include a slower interaction mode, a warning before accelerating an inhabited shared world, or a creator-only observation mode. None is selected yet, and slowing only the camera while needs continue racing is not a complete solution.

The creator retains speed control. Automatic slowdown on conversation, danger, or player arrival remains optional and visible, subject to a shared-world policy. Preserve readable anticipation for consequential actions without pretending that every system can simultaneously run at unlimited speed and human conversational pace.

## Model deadlines and stale work

Keep wall-clock operational time distinct from simulation time. API timeouts, retry backoff, latency measurements, and usage windows use real time. Plans, appointments, survival deadlines, and effect durations use simulated time. Each asynchronous job records both its real-time timeout and its simulated validity horizon, plus relevant entity versions and its originating plan ID.

A response arriving after death, a goal change, target movement, resource depletion, or its validity horizon requires rejection or revalidation. Pausing does not stop an API timeout; accelerating does not increase provider throughput. Short reservations expire by their declared domain, and expiration cannot accidentally grant duplicate resources.

Higher speed creates more decisions per real minute unless controllers can aggregate them. Coalesce equivalent stimuli, limit queued work, cancel obsolete jobs, and keep basic survival deterministic. Measure overdue critical events, queue age, and rejected stale responses. More simultaneous model calls alone is not a speed-control design.

## Catch-up, load, and presentation

Maintain separate requested and achieved simulation advancement. If processing cannot keep up, accumulate bounded **time debt** and display the achieved rate. Never claim a day elapsed while omitting that day's food consumption or silently dropping a lethal transition. The initial overload policy should reduce achieved speed visibly rather than build an unbounded backlog; automatic caps and acceptable debt are tuning decisions.

Catch-up advances from boundary to boundary: food exhaustion, sleep completion, weather change, action completion, injury transition, and next scheduled decision. Aggregate stable intervals analytically where valid. Subdivide interactions where ordering matters, such as spreading fire or competing resource use. A coarse interval must not jump over a condition that would have changed behavior or caused death.

Rendering interpolates frequent nearby state samples; distant actors may use summarized travel and work. Set maximum interpolation gaps and teleport/catch-up presentation thresholds explicitly during tuning. When updates exceed those gaps, show a state transition or catch-up indicator rather than a misleading smooth reconstruction. Do not invent detailed conversations to fill unsimulated intervals.

## Persistence, absence, and multiple sectors

Save the simulation timestamp, rate, pause state, calendar rules, any lifecycle coefficient, pending event boundaries, work progress, last-integrated timestamps, RNG state, and clock-change journal. Replay accepted outcomes and recorded model proposals under their original mechanism versions. Restart must neither double-apply effects nor treat service downtime as elapsed world time without an explicit offline policy.

For the first personal world, the saved pause preference selects whether foreground attention is required. Heartbeats report visibility plus window focus; an open authenticated event stream separately proves connection. With the checkbox off, that connection permits background progression even when heartbeats are throttled. All closed/disconnected tabs eventually pause the world; foreground heartbeat leases have a twelve-second grace period. Save/resume from committed state without simulating missed hours. Necessary saving, cancellation and usage reconciliation may finish without world advancement.

Connected background progression is explicitly opted into by unchecking **Pause game when hidden**. This does not enable fully offline progression, running after server shutdown, or shared-world pause arbitration. Those modes still need separate decisions about human protection and offline exposure.

Connected sectors share the same world clock and rate. They may process concurrently and at different detail levels, but cannot independently choose incompatible calendar speeds while freely exchanging people and resources. Synchronize timestamped boundary transfers and catch up a destination before activation. Separate isolated scenarios can own separate clocks. Begin with one wilderness region and measure survival coherence, conversational usability, and sustained achieved speed before choosing final ratios.
