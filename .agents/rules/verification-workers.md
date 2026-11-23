# Managed verification workers

Read before requesting, starting, claiming or using any remote verification machine. [Verification](verification.md#choose-the-execution-location) selects location/checks; [AWS access](aws.md) and [spending](verification.md#spending) apply. Workers are disposable test environments, never production game servers.

## Standard speed-test worker

The standard machine for speed tests is **m7i.xlarge: 4 vCPU, 16 GiB RAM, x86_64, in `us-east-2`, project `027677879749`**. Use the managed pool when available, through its matching maintained runner and current claim. Verify the actual machine and environment. Select an available matching worker through the pool. Record the hardware and stop/start session because matching instance type alone does not establish a matched comparison.

For player-visible browser checks, Mike approves his **Apple M1 Pro Mac during normal use**, including while other applications are active. Keep the measured game server on the standard AWS worker. The runner's attached browser session uses the visible local browser and a private tunnel to the worker. Record the Mac, browser and version, graphics backend, display settings (including viewport and scale), competing load and network path. For comparisons, repeat the relevant conditions and disclose changes that limit the result. Report client rendering and input-to-visible time separately from isolated server timing. Client-to-server communication includes the network and tunnel delay. Identify any part of that delay you could not measure separately.

Where a browser is available on a CPU-only AWS machine, use it for functional outcomes such as whether a command updates the screen. An accelerated graphics claim needs actual rendered play on a representative graphics device. The maintained runner at `0d9d2419a` supports three CPU machine profiles and has no GPU profile. Verify the deployed runner's capabilities before planning another setup. For another client device, reuse Mike's recorded approval within its scope or obtain his choice. A different server instance type or a local server speed test still requires Mike's explicit instruction. Static and correctness checks follow Verification's location rules.

## Current availability

The managed AWS pool and maintained CLI have been delivered separately; their runner code is **not integrated into this checkout**. [VW01–VW04](../../docs/maintainers/verification-workers.md) retain integration and qualification tracking. Existing profilers and temporary task-specific scripts are not a managed pool.

Find the runner revision in the authorized task or deployment record. For a local runner, `git worktree list` can locate its checkout. Verify that it matches the deployment and read that checkout's worker instructions for the supported commands. Use the runner to read current status and claim the experiment. An instance can be stopped while another task still owns it. Using the separate checkout requires no merge.

If the managed pool is busy, use its bounded wait or do independent work. If the matching runner is unavailable, an already authorized, task-owned AWS instance may be used under its existing ownership, deadline and cleanup rules. For timing it must match the standard machine and environment. Otherwise record the missing evidence. Do not create a substitute pool, take another task's worker or assume a temporary worker will stop instead of terminate. Suitable local non-timing checks can still establish correctness.

## Procedure with a matching maintained runner

### Parallel comparisons and reuse

One task owner coordinates admissions across agents. Run independent ready experiments on separate standard workers when live capacity and the shared budget permit. Report the specific dependency, capacity or budget limit when experiments must run in sequence.

Keep each comparison's interleaved repetitions on one assigned worker. Keep comparisons that reuse a control on the same worker under the [experiment planning rules](../../docs/performance/measurement.md#planning-comparisons). Use the runner's concurrency and worker-affinity settings, exclusive processes and PostgreSQL, and fresh case databases. Freeze the plans before dispatch.

After verified cleanup, admit a ready successor through the controller. There is no need to wait out an idle timer. A stop or start already underway still blocks a claim. Retain outstanding cost reservations until reconciliation.

Reuse qualified tools and build artifacts under the [build identity contract](../../docs/projects/verification-workers-tech-design.md#verified-build-reuse). The separately delivered runner can be used before its branch is integrated here. Missing cache support is tracked in [VW02](../../docs/maintainers/verification-workers.md#delivery-order); a slow preparation step does not authorize an ad-hoc runner or a relaxed source check.

### Run lifecycle

1. **Plan.** Select the existing check, workload, immutable source, required outcome, timeout, output allowance and cost. Prepare inputs before claiming. For performance comparisons follow [experiment planning](../../docs/performance/measurement.md#planning-comparisons). When using the game's existing profilers, consult their [tool-specific instructions](../../docs/maintainers/performance-profiling.md). Apply browser or live-playtest procedures when the selected check calls for them. A worker grants no extra tests or paid AI.
2. **Admit and claim.** Review project/Region, source, machine and deadline. Reserve a cloud allocation within the shared task budget; other work cannot spend that allocation too. The controller admits against it and atomically claims the whole worker, including PostgreSQL, for the experiment only. Busy callers wait boundedly or do independent work; no private replacement bypasses the pool cap.
3. **Prepare.** Resume the claimed worker; only the allocator provisions missing capacity within budget. Verify environment/source hashes, checkout-local workspace dependencies, a fresh database, free disk and no foreign workload. Run Git-inventory checks against the exact versioned checkout before packaging; managed source archives contain no `.git`. Reuse tools/cache, never another game's state. Report checkout changes under the root rule.
4. **Execute.** Use the supervised runner under the current worker ID, claim generation and run ID. It owns the processes, deadlines and logs. Follow the selected campaign mode's heartbeat rules. For example, an attached campaign needs its CLI alive. Diagnostic access must also respect the claim. Do not launch work directly through SSH or SSM.
5. **Collect and release.** Confirm that the runner exported the results and cleaned up the processes, databases and workspaces owned by this run. Failed cleanup quarantines the worker. Verify the required artifacts and their checksums outside Git before permitting expiry. Apply the [verification record and scratch rules](verification.md#run-and-report-the-selected-checks) to the submitting machine after collection. Retrieve the later stop, retirement or reuse status and reconcile costs. Report the runner's estimated usage and outstanding holds separately from any invoiced charges. Release returns after cleanup, while retained storage can still accrue charges.

If the submitting client disconnects, inspect the original campaign and use the matching runner's resume or collection command. Preserve its frozen inputs, completed and failed cases, reservations and remaining work. Starting a new campaign cannot recover the old one. If a lease expires, use the runner's recovery or quarantine procedure. A former owner cannot operate under a later claim. Lost output and uncertain cleanup remain failures. Verify that the intended gameplay occurred even when every command exited successfully.

When a [proven common blocker](../../docs/performance/measurement.md#planning-comparisons) prevents the required work, withhold the affected repeats that have yet to be submitted. For queued work, use the matching runner’s supported cancellation. At revision `0d9d2419a` cancellation acts on an entire campaign and can interrupt active jobs. Keep its manifest intact. Collect and reconcile completed, interrupted and never-started cases. Keep independent campaigns running. If a cancelled campaign included useful independent work, schedule its outstanding comparisons with their matched conditions and budget after reconciliation.

## Reports and implementation changes

Use the [common report contract](../../docs/projects/verification-workers-tech-design.md#measurement-and-artifacts): separate setup, measured work and cleanup, preserve the full phase timeline and actual completed work, and distinguish skipped/unavailable data from zero. Reuse profiler outputs rather than create another measurement system.

When designing a worker change, read the affected sections of the [feature specification](../../docs/projects/verification-workers-feature-spec.md) and [technical design](../../docs/projects/verification-workers-tech-design.md), and the [worker task](../../docs/maintainers/verification-workers.md) that owns it. This includes a proposed new bootstrap file. Before implementing changes to the pool, runner, bootstrap, claims, cache, watchdog or report format, read both specifications in full and the affected tasks. Keep operational defaults in the worker contract.
