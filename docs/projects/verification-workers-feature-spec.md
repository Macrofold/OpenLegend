# Reusable verification workers — feature specification

| Status      | Current progress                                                                              | Last updated |
| ----------- | --------------------------------------------------------------------------------------------- | ------------ |
| Not started | Design and agent instructions are complete; the managed pool and runner remain unimplemented. | 2026-10-31   |

## Purpose and scope

Run expensive game checks without occupying Mike's computer, while making setup cheap, measurements comparable and ownership unambiguous. Reuse stopped AWS machines with installed tools and dependency caches. Give each experiment a clean source snapshot, database and process lifecycle. Use the existing game profilers and browser tools rather than another test framework.

The current repository has native, PostgreSQL-backed server and browser profiling tools. Previous AWS experiments used temporary task-specific upload/bootstrap/SSH wrappers. They establish that remote verification is useful, not that a reusable pool, complete setup timeline or graphics qualification exists. This project delivers that operational workflow; it changes no game mechanic, authored-world default or required gameplay acceptance.

## Selected behavior

- Short, inexpensive static/correctness checks normally stay local. Sustained server profiling, expensive storage/population experiments and resource-heavy checks use a dedicated worker when available. [Verification policy](../../.agents/rules/verification.md#choose-the-execution-location) owns the selection, including user overrides and the continued ban on GitHub Actions.
- Begin with one reusable worker; allow a second only for actual concurrent demand within the configured cap and budget. Ten agents can share this small pool over time. Each run claims the whole worker exclusively, even for functional checks. Sharing CPU, database or disk would complicate cleanup and invalidate performance comparisons; no simultaneous shared-job mode is part of this design.
- A claim identifies a task, worktree, immutable source, experiment and deadline. It covers preparation through cleanup, including a planned sequential comparison, but not unrelated coding time. Losing the owner stops the run safely. Neither a stale tag nor an expired timestamp grants ownership.
- Stopping retains the installed environment and caches on encrypted EBS. It does not preserve a live game or require hibernation. Fresh machine installation means installing OS/toolchain/database prerequisites; normal worker reuse skips it. Dependency preparation reuses compatible cached downloads but still validates the lockfile and local workspace links.
- Transfer a compressed, checksummed source snapshot. No push is required just to test. A cached Git fetch of an exact commit is an optional later transport only if timing demonstrates a benefit; moving-branch pulls and long-lived repository credentials are excluded.
- One run report explains where wall time went, what actually happened during the experiment, where logs reside and whether cleanup finished. Failed and interrupted runs are retained as such. No blanket five-minute duration or promised setup speed: the workload question selects duration, and cold/warm overhead is measured.
- Server speed, browser frame pacing and input-to-visible-response are separate outcomes. A full-game smoothness claim requires representative rendered play, not only server throughput or average FPS. Use an AWS backend with a representative local browser when useful; do not claim hardware graphics performance from a CPU worker's software renderer.

## Agent journeys and failure behavior

**Ordinary feature check:** an agent chooses focused checks through Verification, runs cheap ones locally and reports their scope. It does not load cloud implementation details or start a worker merely because tests exist.

**Before/after performance comparison:** an agent pins both source snapshots, chooses matching workload/settings, admits the complete cost and claims one worker. It prepares each source and fresh database sequentially, excludes setup/warm-up from the measured interval, saves both results and releases after cleanup. Same worker does not guarantee identical hardware after stop/start; the report records that distinction.

**Concurrent worktrees:** one claimant wins a worker atomically. Others receive busy status with current claim/deadline and wait boundedly or do independent work. A second worker may serve another claim only within the pool cap. There is no ten-machine fan-out and no claim held while an agent keeps editing. Initial allocation is best-effort, not a strict FIFO scheduler; persistent queues are unnecessary at this scale.

**Lost owner or uncertain execution:** missed heartbeats stop further dispatch. The supervisor terminates owned work; recovery confirms old processes and commands cannot resume before reuse. A failed database cleanup or uncertain late command quarantines the machine. A cancelled command is never silently replayed. Another worker may serve independent work within the same cap; replacing a quarantined machine does not create an extra unaccounted slot.

**Interactive graphics check:** the agent schedules the browser work on an appropriate device, connects privately to the claimed backend, records network/client/server conditions and exercises actual controls. It releases both the connection and worker after collecting evidence. GPU fleet provisioning and a browser-device farm are outside this delivery.

## Acceptance and stages

The [VW tracker](../maintainers/verification-workers.md) owns execution order and exit criteria. Required passes establish exclusive ownership, stale-owner rejection, clean reuse, source fidelity, aggregate spending admission, crash cleanup and reliable result retrieval. A cold and warm standard experiment must produce a complete stage timeline and actual gameplay/progress evidence. Measure overhead and cache benefits; no guessed speedup is a pass threshold. Report poor results and their bottlenecks before designing extra infrastructure.

Browser integration must demonstrate one real input-to-rendered-response journey and retain frame-pacing/network evidence on a named device. This verifies the workflow; it does not certify every GPU or establish hundreds-of-characters capacity. Project-specific correctness, gameplay and capacity gates remain with their existing owners. New automated test authoring still requires Mike's request; use existing tooling and controlled disposable fault scenarios for this delivery.

## Maintained records

- Implementation and qualification: [VW01–VW04](../maintainers/verification-workers.md).
- Operational defaults, limits and lifecycle: [Technical design](verification-workers-tech-design.md). These are development infrastructure limits, not gameplay rules; no separate gameplay limits inventory applies.
- Agent procedure: [Managed verification workers](../../.agents/rules/verification-workers.md).
- Open product decisions: None. Deployment must resolve current prices, available instance/image IDs and access from the selected project; those are implementation facts, not authority to spend or provision from this document alone.
