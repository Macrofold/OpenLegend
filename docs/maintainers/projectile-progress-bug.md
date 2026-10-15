# Released projectile does not complete the hunting journey

**Open bug — recorded during UI qualification; investigation and repair are outside the UI task at Mike's explicit direction.**

Parent owner: [CF02 — Aim, projectiles and real cover](parallel-batch-06-rivals-and-contested-ground.md#cf02--aim-projectiles-and-real-cover). This entry owns the concrete regression below, not the broader combat acceptance program.

## Reproduction and observed result

Repository: `Macrofold/OpenLegend`, branch `docs/game-ui-research-redesign`, observed source `c7d456fce76e14a277e33736df21c9fefbff56a3`.

Run the existing `apps/server/src/context.test.ts` scenario **executes a learned tool and food loop through scoped feasible candidates**, with the repository's disposable PostgreSQL fixture and providers disabled. The scenario learns and crafts its exact sling, equips that physical item, starts hunting `hare-1`, and advances through shot release. The expected continuation is actual flight resolution, followed by the ordinary harvest/cook/eat journey when the target is killed.

The recorded run produces the `shot-released` event at simulation time 78, but the test does not reach the expected target death. The last ten events shown in the failure contain no resolved shot. The latest complete [qualification job](https://github.com/Macrofold/OpenLegend/actions/runs/38658520494/job/116173941725) reports **69 passed / 2 failed out of 71**; the other failure is a separate cognition trace-order expectation, not this bug.

An earlier continuation reported `movement.slice.events limit (512) exceeded`, unchanged time and no navigation block. That specific cause was **not established by the latest job linked above**. Preserve it as a diagnostic lead to verify, not a confirmed root cause. Do not infer that the target was hit, that damage was applied, or that the UI introduced the defect merely from the shot-release event.

## Expected behavior and exit criteria

- [ ] Reproduce the failure on the exact source and establish whether it is a fixture assumption, a flight/time-progress defect or another native outcome. Compare the relevant base only as needed to determine introduction; no baseline attribution is established here.
- [ ] Account for the released projectile through its real final outcome. A miss or interception is legitimate; an unresolved shot or rejected time step needs an explicit, actionable explanation rather than fabricated target death.
- [ ] Correct the responsible owner or demonstrably stale fixture, preserving finite ammunition, collision/cover, injury permission, deterministic time and randomness, and current work limits. Do not raise budgets, force a kill or remove assertions merely to make the test pass.
- [ ] Re-run the focused existing journey and a relevant failure case; record the actual outcome and source. Broader combat qualification remains with CF02.

No combat code or test was changed when recording this entry. This bug is excluded from the UI completion work, but recording it does not make failing repository-wide CI green.
