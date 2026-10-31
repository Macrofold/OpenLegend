# Managed verification workers

Read before requesting, starting, claiming or using any remote verification machine. [Verification](verification.md#choose-the-execution-location) selects location/checks; [AWS access](aws.md) and [spending](verification.md#spending) apply. Workers are disposable test environments, never production game servers.

## Current availability

The [design](../../docs/projects/verification-workers-feature-spec.md) is complete; the pool/controller/runner are **not implemented or provisioned**. [VW01–VW04](../../docs/maintainers/verification-workers.md) track delivery. Existing profilers and temporary task-specific scripts are not a managed pool.

Until delivery, use an already authorized task-owned environment under its actual ownership, deadline and cleanup rules, suitable local checks, or report the gap. Do not adopt another task's worker, assume a temporary worker stops instead of terminates, or invent a cloud harness inside unrelated feature work. This design does not authorize provisioning.

## Procedure once the managed runner is available

1. **Plan.** Select the existing check, workload, immutable source, required pass/measurement, timeout, output allowance and cost. Prepare inputs before claiming. For performance use the [profiling procedure](../../docs/maintainers/performance-profiling.md); applicable browser/live-playtest procedures remain. A worker grants no extra tests or paid AI.
2. **Admit and claim.** Review project/Region, source, machine and deadline. Reserve a cloud allocation within the shared task budget; other work cannot spend that allocation too. The controller admits against it and atomically claims the whole worker, including PostgreSQL, for the experiment only. Busy callers wait boundedly or do independent work; no private replacement bypasses the pool cap.
3. **Prepare.** Resume the claimed worker; only the allocator provisions missing capacity within budget. Verify environment/source hashes, checkout-local workspace dependencies, a fresh database, free disk and no foreign workload. Reuse tools/cache, never another game's state. Report checkout changes under the root rule.
4. **Execute.** Use the supervised runner with worker ID, generation and run ID; maintain heartbeats. It owns processes, deadlines and logs. No unfenced SSH/SSM launch; diagnostic access retains the same claim.
5. **Collect/release.** Verify required artifact collection outside Git before permitting expiry. Release cleans only owned processes/databases/workspaces; failure quarantines. It returns after cleanup, without waiting through the idle-stop delay. Later stop/reuse and cost status remain collectable; retained EBS still costs money.

An expired heartbeat means **recover or quarantine**, not “free to take.” A former owner cannot affect a later generation. Use runner status/recovery, not manual claim deletion. Lost output and uncertain cleanup remain failures; command completion alone does not prove intended gameplay occurred.

## Reports and implementation changes

Use the [common report contract](../../docs/projects/verification-workers-tech-design.md#measurement-and-artifacts): separate setup, measured work and cleanup, preserve the full phase timeline and actual completed work, and distinguish skipped/unavailable data from zero. Reuse profiler outputs rather than create another measurement system.

Graphics claims use representative visible-browser mode and actual rendered interaction; headless/software diagnostics are separate. A remote backend leaves browser load on the client and adds network latency; record both.

Before implementing or changing the pool, runner, bootstrap, claims, caching, watchdog or report format, read the complete [feature specification](../../docs/projects/verification-workers-feature-spec.md), [technical design](../../docs/projects/verification-workers-tech-design.md) and affected [VW tasks](../../docs/maintainers/verification-workers.md). Keep operational defaults there, not in game/world policy or copied into agent-specific scripts.
