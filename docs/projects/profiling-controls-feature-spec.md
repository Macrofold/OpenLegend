# Optional performance profiling — feature specification

| Status      | Current progress                                                                                                       | Last updated |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Code and focused checks are complete; the two full-game observations had unequal activity and cannot qualify overhead. | 2026-10-18   |

**Specification reviewed and synchronized — October 18, 2026, 00:02 EDT.** The selected feature behavior is unchanged. Current implementation departures and the remaining verification limits are recorded in the linked tracker and technical design.

**Implementation update — October 17, 2026, 20:12 EDT.** Mike authorized implementation of the complete package. The [profiling-controls tracker](../maintainers/profiling-controls.md) owns current completion and verification; the earlier source findings below describe the design baseline. No smooth-3× result is asserted.

**Design updated:** October 17, 2026, 18:10 EDT. The original proposal is implemented; the runtime switch is now off by default. Required verification remains tracked separately.

## The answer in plain language

**Ordinary play now skips optional performance collection.** The following table compares the original source findings with the implemented contract. The browser keeps its independent `?profile=1` choice. Server measurements now default off, and route calculation and background saving follow that process choice. The simulation’s finer work counters remain a separate deliberate instrument. These controls remove measurement work, not required gameplay calculations.

| Area                            | Before this package                                                                                                                                               | Implemented result                                                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Normal server execution         | Timings and counters accumulate; process monitoring starts automatically.                                                                                         | Off by default. One startup setting enables performance collection.                                                                                    |
| Route calculation               | Timing and measurement preparation also happen in its worker. A timer repeatedly measures the age of waiting routes.                                              | Inherit the server's choice. With profiling off, keep route calculation and its real failure deadline, but skip timing and the measurement-only timer. |
| Background database application | Each batch installs a timing listener and prepares SQL timing statistics.                                                                                         | Saving works identically; optional statistics are absent when disabled.                                                                                |
| Browser                         | Detailed collection requires `?profile=1`; a little measurement work still occurs outside that gate. Stopping leaves outstanding GPU queries until later cleanup. | Normal pages skip optional measurement. Stop releases measurement resources immediately and freezes the completed report.                              |
| Native simulation counters      | No collector means an inexpensive check at each counting site. Arguments to that check can still do work.                                                         | Keep that design; remove diagnostic-only argument preparation when collection is absent.                                                               |
| Performance tools               | Several assume server measurements are always available.                                                                                                          | Explicitly enable collection, identify the chosen settings in reports, and support a matched comparison with application profiling off.                |

These are source findings, not measured savings. We have **not established that profiling is a major cause of the current slow game**, nor that this project will make the game reach smooth 3× speed. The project makes ordinary execution cheaper and future evidence easier to trust.

## Purpose and supported behavior

Ordinary play should spend no time collecting optional performance histories. A developer investigating a slow walk should be able to enable the existing measurements deliberately, reproduce the walk, read a bounded report, then return to ordinary execution.

Server configuration is `OPEN_LEGEND_PROFILING=off|on`, default `off`. For example, `OPEN_LEGEND_PROFILING=on pnpm dev` starts a profiled server. Changing this setting requires restarting that process. This deliberate limitation avoids a remotely controlled profiling service and worker reconfiguration machinery.

Browser collection remains local to the selected tab: add `?profile=1` and reload. If the URL already has a query, add `&profile=1`. Remove that parameter and reload to return to ordinary execution. The existing browser capture API can stop and restart collection within an opted-in page. Server and browser switches are independent because they run in different processes; a browser URL must never enable server-wide collection for other people.

Detailed CPU sampling, allocation sampling and browser traces remain separate, explicitly requested tool options. Enabling the ordinary server or scene measurements must not automatically start those heavier tools.

## Target journeys

| Journey                                                          | Required outcome                                                                                                                                                                                                           |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Launch the game without profiling settings and click to walk.    | Movement, saving, character decisions and the visible FPS display retain their behavior. No optional server timing tables, process sampler or scene collector is active.                                                   |
| Restart with server profiling on and reproduce the walk.         | The existing protected performance endpoint says collection is enabled and reports actual samples. Workers collect their optional timings too. A missing sample never means that the operation took zero time.             |
| Open an opted-in browser tab.                                    | The existing collector captures cold scene preparation, then can start a fresh measured interval. It remains bounded as today.                                                                                             |
| Stop browser capture while GPU results are outstanding.          | Return a completed report identifying uncollected GPU work; release its queries without waiting for the GPU. Later frames do not change that report. A new capture starts empty.                                           |
| A background memory search or save fails while profiling is off. | Existing sanitized failure reporting and actual failure behavior remain available. The profiling switch never hides a save failure or causes a paid retry.                                                                 |
| Compare a profiled run with an ordinary run.                     | The same workload and independent observations are used. Missing optional measurements are marked disabled, not replaced with successful-looking zeros. The report states which remaining observations still add overhead. |

These are engineering journeys, not new gameplay or AI-agent capabilities. Characters do not know whether profiling is enabled, and no character gains extra information or actions.

## Scope and strict requirements

Reuse the existing server collector, domain counter sink, scene collector and profiling tools. Do not introduce a telemetry service, general plugin system, new storage tables, runtime settings UI or network endpoint for switching collection.

The switch controls **performance measurement**, not every form of logging. Preserve saved action history, operational failure records, permission checks, spending/accounting, provider request outcomes and the existing Intelligence inspection feature. Reducing that separate feature's capture cost remains [PF06 work](../maintainers/performance.md#pf06--optional-diagnostics-and-bounded-buffers).

Keep all clocks and counts that affect real behavior: simulation progression, action deadlines, fair scheduling, queue expiry, save cadence, worker watchdogs, interaction animation and the player-facing FPS display. Do not make correct gameplay depend on whether a measurement is present. Profiling overhead can affect real-time scheduling; deterministic equivalence is checked with the same admitted simulation inputs, not by assuming equal wall-time runs must have identical events.

No saved-world, protocol authorization, world law, cognition policy, gameplay cap or compatibility layer changes. All runtime profiling state remains temporary and outside saved worlds. The same mechanism must work with the bundled world and a different installed world's content without inspecting authored names or changing rules.

## Meaningful failure and reporting

- An invalid server profiling setting fails configuration with a clear message before gameplay starts. Never silently turn it on.
- A profiling listener that throws is detached and reported using the existing sanitized diagnostic behavior. It must not turn a successful gameplay operation into a failure. Optional request decoding must preserve the original request and its normal server result; failed tool setup must still release every acquired resource.
- Missing optional browser GPU support means unavailable GPU measurements; CPU/frame collection can continue. It never means zero GPU cost.
- Disabled, unavailable, stopped, omitted and observed measurements remain distinguishable. Operational failures are independent of those states.
- Real worker, database or authorization failures keep their current handling. No additional retries, speculative fallback systems or error taxonomies are part of this project.

## Delivery and acceptance

Deliver the shared server switch first, then propagate it through worker and browser owners, then update tools and measure the complete result. Detailed dependencies and completion criteria belong to [PC01–PC06](../maintainers/profiling-controls.md); implementation algorithms belong to the [technical design](profiling-controls-tech-design.md).

Acceptance requires both behavior preservation and evidence that disabled collection actually avoids work. A hidden report or an empty output alone is insufficient. Enabled capture must still produce useful timings, bounded memory and honest omissions. Report observed overhead rather than promising zero overhead: even a disabled check or existing wrapper can have a small cost.

The default-off choice trades continuous performance history for lower routine work. A slowdown that happened before collection was enabled cannot be reconstructed from missing timings. Operational failures remain recorded. Server restart is the selected way to change its mode; live server toggling is outside this project, not an unfinished requirement.

## Maintained records

- Implementation and acceptance: [PC01–PC06](../maintainers/profiling-controls.md), a focused part of [PF06](../maintainers/performance.md#pf06--optional-diagnostics-and-bounded-buffers).
- Mechanism and implementation order: [technical design](profiling-controls-tech-design.md).
- Existing and proposed constraints: [LA209](../limits/observability.md#la209), [LA210](../limits/observability.md#la210), [OB01](../limits/observability.md#ob01--explicit-browser-performance-capture), [OB02](../limits/observability.md#ob02--optional-profiling-controls).
- Current usage and reproduction: [profiling guide](../maintainers/performance-profiling.md). It documents the implemented switches and commands.
