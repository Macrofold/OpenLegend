# Reusable verification workers — feature specification

| Status      | Current progress                                                                              | Last updated |
| ----------- | --------------------------------------------------------------------------------------------- | ------------ |
| Not started | Design and agent instructions are complete; the managed pool and runner remain unimplemented. | 2026-10-31   |

## Purpose and scope

Run expensive game checks without occupying Mike's computer, while making setup cheap, measurements comparable and ownership unambiguous. Reuse stopped AWS machines with installed tools and dependency caches. Give each experiment a clean source snapshot, database and process lifecycle. Use the existing game profilers and browser tools rather than another test framework.

The repository already has native, PostgreSQL-backed server and browser profilers. Previous AWS runs copied checksummed source archives with SCP and used SSH wrappers to invoke Node/tsx profiling tools. The full-server profiler creates the real server programmatically with its disposable PostgreSQL database; this does not require `pnpm dev`. Reports/process logs are retained outside Git; [existing remote evidence](../verification/performance/2026-10/attention-runtime.md) covers several runs, not a first experiment. Complete setup/upload/dependency timelines and representative graphics remain unqualified. This project supplies the reusable workflow without changing game mechanics, world defaults or gameplay acceptance.

## Selected behavior

- Short, inexpensive static/correctness checks normally stay local. Sustained server profiling, expensive storage/population experiments and resource-heavy checks use a dedicated worker when available. [Verification policy](../../.agents/rules/verification.md#choose-the-execution-location) owns the selection, including user overrides and the continued ban on GitHub Actions.
- Begin with one reusable worker; allow a second only for actual concurrent demand within the configured cap and budget. Ten agents can share this small pool over time. Each run claims the whole worker exclusively, even for functional checks. Sharing CPU, database or disk would complicate cleanup and invalidate performance comparisons; no simultaneous shared-job mode is part of this design.
- A claim identifies a task, worktree, immutable source, experiment and deadline. It covers preparation through cleanup, including a planned sequential comparison, but not unrelated coding time. Losing the owner stops the run safely. Neither a stale tag nor an expired timestamp grants ownership.
- Stopping retains tools and caches on encrypted EBS; it preserves no live game and needs no hibernation. Fresh installation means installing OS/toolchain/database prerequisites; reuse skips it. Pnpm reuses unchanged package content across lockfile changes while each workspace gets a validated fresh installation.
- Transfer a compressed, checksummed source snapshot. No push is required just to test. A cached Git fetch of an exact commit is an optional later transport only if timing demonstrates a benefit; moving-branch pulls and long-lived repository credentials are excluded.
- One report explains setup, actual gameplay, logs and cleanup, preserving failures. Release returns after verified cleanup; it does not hold the agent for the idle-stop delay. Required results cannot expire before verified collection. Workload questions select duration; cold/warm overhead is measured, not promised.
- Server speed, browser frame pacing and input-to-visible-response are separate outcomes. A full-game smoothness claim requires representative rendered play, not only server throughput or average FPS. Use an AWS backend with a representative local browser when useful; do not claim hardware graphics performance from a CPU worker's software renderer.

## Agent journeys and failure behavior

**Ordinary feature check:** an agent chooses focused checks through Verification, runs cheap ones locally and reports their scope. It does not load cloud implementation details or start a worker merely because tests exist.

**Before/after performance comparison:** an agent pins both sources and matching workload/settings, reserves a cloud share of the task budget and claims one worker. Each ordered case gets fresh source/database preparation and measured activity; old-case commands cannot affect the next case. Save both results and release after cleanup. Cold/warm state and hardware remain recorded comparison conditions, not assumed equivalent after stop/start.

**Concurrent worktrees:** one claimant wins a worker atomically. Others receive busy status with current claim/deadline and wait boundedly or do independent work. A second worker may serve another claim only within the pool cap. There is no ten-machine fan-out and no claim held while an agent keeps editing. Initial allocation is best-effort, not a strict FIFO scheduler; persistent queues are unnecessary at this scale.

**Lost owner or uncertain execution:** missed heartbeats stop further dispatch. The supervisor terminates owned work; recovery confirms old processes and commands cannot resume before reuse. A failed database cleanup or uncertain late command quarantines the machine. A cancelled command is never silently replayed. Another worker may serve independent work within the same cap; replacing a quarantined machine does not create an extra unaccounted slot.

**Interactive graphics check:** the agent uses a representative visible browser and a private tunnel to the worker's loopback server, exercises actual controls and records network/client/server conditions. Shared profiler start signaling coordinates remote capture; a copied local filename does not. Headless diagnostics remain separately labeled. Release the tunnel/worker after collection; GPU fleets and browser-device farms are outside delivery.

## Acceptance and stages

The [VW tracker](../maintainers/verification-workers.md) owns execution order and exit criteria. Required passes establish exclusive ownership, stale-owner rejection, clean reuse, source fidelity, aggregate spending admission, crash cleanup and reliable result retrieval. A cold and warm standard experiment must produce a complete stage timeline and actual gameplay/progress evidence. Measure overhead and cache benefits; no guessed speedup is a pass threshold. Report poor results and their bottlenecks before designing extra infrastructure.

Browser integration must demonstrate one real input-to-rendered-response journey and retain frame-pacing/network evidence on a named device. This verifies the workflow; it does not certify every GPU or establish hundreds-of-characters capacity. Project-specific correctness, gameplay and capacity gates remain with their existing owners. New automated test authoring still requires Mike's request; use existing tooling and controlled disposable fault scenarios for this delivery.

## Maintained records

- Implementation and qualification: [VW01–VW04](../maintainers/verification-workers.md).
- Operational defaults, limits and lifecycle: [Technical design](verification-workers-tech-design.md). These are development infrastructure limits, not gameplay rules; no separate gameplay limits inventory applies.
- Agent procedure: [Managed verification workers](../../.agents/rules/verification-workers.md).
- Open product decisions: None. Deployment must resolve current prices, available instance/image IDs and access from the selected project; those are implementation facts, not authority to spend or provision from this document alone.
