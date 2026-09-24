# Simulation time and update cadence

This is the canonical clock/integration contract. [Performance](performance.md) owns measurement and optimization; [PF13](maintainers/performance.md#pf13--elapsed-time-simulation) owns delivery. The [boundary catalogue](maintainers/simulation-boundaries.md) is a running inventory of exact deadlines, conservative limits and still-unknown bounds, not a promise that every scenario is event-driven already.

## Independent clocks

The bundled world's default rate is 60 game seconds per real second at 1x. This converts elapsed time; it does **not** prescribe 60 simulation transitions per real second. The simulation accepts elapsed game time and divides it only where a relevant mechanical boundary or explicit fidelity bound requires it. Faster clock settings increase the time owed, not a mandatory number of whole-world ticks.

Rendering runs independently at the browser/device frame cadence (normally aiming at 60 FPS or the display refresh rate). State delivery can be less frequent. A possible 20 Hz publication policy is not a 20 FPS rendering limit. Camera/input remain responsive between state arrivals; visual interpolation never authorizes movement or reveals an NPC's future plan. Thin walls still require swept collision, not endpoint-only checks. Unknown intermediate support/topology must not be filled in with invented motion through floors.

## Native interval contract

A native interval has a start time, a finite elapsed duration and an end time. Resolve currently due native decisions, status transitions and zero-duration action stage changes at the start. Integrate the already-active rates/work over the interval. Commit completions, expiry, body changes and permitted observations at the end, then reconsider before consuming more time. An action created at the end cannot receive the preceding interval's work. A condition that changes at the end cannot retroactively govern that interval.

Choose the next interval using the earliest relevant known boundary and a finite fallback horizon. Examples include action completion, support/route waypoints, depletion/capacity, effect conditions, daily-window edges, wandering/perch timers, landing, death and obligation/conversation deadlines. Conditional rates are selected from the interval's starting state. Reevaluate after a command, geometry edit, capability change or load; derived predictions are not saved authority.

Separate exact arithmetic from sensing fidelity. Straight movement is continuous and swept; spatial perception may be sampled at a documented maximum displacement while exact visibility-crossing certificates remain future work. Do not imply that endpoint sampling proves every fleeting visibility/contact event was detected. New emitters must produce their evidence at the actual occurrence state, not at the next arbitrary host callback.

No unbounded fixed-point loop is allowed. Bound zero-time transitions, computation and queued work, retain unpaid time as debt, and expose technical blocking honestly. A CPU pause is not in-world hunger. Shared input ordering, conserved resources, collision, observer scope, action completion and durable command boundaries remain authoritative. Superseded one-second traces are not a new-world compatibility requirement; accepted semantic changes and numerical limits must be recorded.

## Host and persistence

The existing host timer is a wake opportunity, not a biological clock. Convert monotonic elapsed real time to owed game time, ask the domain for a bounded prefix, and subtract **actual** advanced time. Publish/yield between bounded prefixes so commands, pause, worker replies and reads can interleave. Do not hide overload by dropping debt, counting attempted calls as progress or weakening command durability. Existing suspension, required-navigation and presence policies remain explicit and separate from computational load.

No new database, per-feature save version or second scheduler/store is introduced. Existing action remainder, flight progress, status episodes and game-time deadlines remain canonical. Any new mechanics needing a durable next-event identity must use their own existing state owner. Recovery rebuilds derived scheduling data and must not redraw random choices merely because a process restarted.

## Extensible boundary ownership

A trusted mechanical family owns its rates, due conditions and valid integration bound. The engine must not hardcode every future world's behavior into one omniscient scheduler. Start with the existing finite families and keep a documented conservative fallback for unsupported coupled behavior. Native implementation is not proof that arbitrary new authored operations can skip time safely.

The catalogue records for each candidate: what stays unchanged, how a deadline/bound is calculated, what invalidates it, what must happen at the boundary, evidence status and the existing implementation owner. Prioritize removing measured repeated work; a heap, worker pool, kinetic certificate or analytic closed form is justified by an actual consumer and measurement, not as a prerequisite to this change.

## Sound/speech integration

See [the branch handoff](maintainers/speech-time-integration.md). Speech emission is a committed occurrence and listener-specific acquisition, not a once-per-tick poll. Stored heard fragments never reroll during interpolation or history reads. Caption reading duration belongs to the real-time presentation clock, with its explicit pause/hidden policy, not accelerated game time. Physical speech duration, if later implemented, needs its own start/end boundaries and movement/occlusion semantics.
