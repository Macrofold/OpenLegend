# Elapsed simulation implementation evidence

[Simulation time](../simulation-time.md) owns the accepted contract. This record separates implemented intervals from verified behavior and remaining acceptance. It supersedes neither the sound branch's evidence nor earlier measurements on different revisions/hosts.

## Recovered scope

Completion resumed from `feature/simulation-cadence` at `7824cf8c6a4e1c6b1777baa1ee2f338735c5d253`. That branch already contains `fdcbd31fc9e4eb31daaf00d997648aba588c8577` and its new agent rules. The requested elapsed-time implementation, base-world time policy, boundary catalogue and speech-branch coordination note survived the interrupted turns. Their final tracker/status reconciliation and application qualification were not yet complete.

Current main at review start is `3c1198bc307bd95f4a1e0ed444aa9d3e1a00d238`, which additionally removes the native memory-consolidation pause. That subsequent change must be preserved in integration; elapsed-time work does not authorize restoring a memory or paid-maintenance gate. No existing world or unrelated branch has been reset.

## Initial static and native observations

The recovered source passed production TypeScript (`tsc --noEmit -p tsconfig.build.json`) and authored status-configuration validation. These are not a passing full-repository check. No automated unit, integration or browser suite was authored or run by this task; normal repository CI remains independent and enabled.

An ad-hoc script invoked the actual initialized Rapier/domain implementation on Node 22.16.0. The same seed-1086 initial world was cloned separately for each run, with no provider calls or database mutations. Each run advanced 480 actual game seconds, offering either one or up to sixty game seconds per call with `maxIntervals: 1`. The latter does not force a sixty-second interval: flight, deadlines, thresholds and fidelity bounds shorten it. These are one diagnostic run per setting, in fixed order, not matched warmed statistical comparisons or whole-game speedups.

| Scene | Offered game seconds/call | Actual game seconds | Integration calls | Wall time | Event additions |
| --- | ---: | ---: | ---: | ---: | ---: |
| Starter, 14 entities | 1 | 480 | 481 | 560.10 ms | 24 |
| Starter, 14 entities | 60 | 480 | 22 | 29.08 ms | 24 |
| Mixed, 318 entities | 1 | 480 | 481 | 5725.46 ms | 4594 |
| Mixed, 318 entities | 60 | 480 | 22 | 609.15 ms | 4594 |

The mixed input added 16 memory-capable people, 48 native deer and 240 resource objects via the existing isolated scenario generator. Added entities were not model-controlled actors. No navigation preparation blocked these runs. One very short strict-threshold crossing accounts for an extra interval; game time was not rounded into ticks. Equal event counts alone do not prove identical intermediate observations or RNG state. Setup, networking, SQL, renderer, cognition and browser frame rate are excluded. The result demonstrates that idle/routine integration no longer needs one whole-world call per game second; it does not certify dense 8x application throughput.

## Integration and remaining evidence

The sound branch was inspected at `8afa972c9001b6fb2ccb8e6f0da0a2905a029f40`; its graded acoustic and caption changes were not merged by this task. [Coordination](../maintainers/speech-time-integration.md) identifies shared mutation, status, exposure and clock boundaries.

Final running-server observations, targeted failure cases, static/link reconciliation and remaining gates will be recorded here as completed. Existing evidence does not establish exact fleeting-exposure detection, a universal coupled-flow integrator, regional scheduling, real-GPU performance or long-session scaling. Those remain explicit future work under the time policy/catalogue and focused maintainers.
