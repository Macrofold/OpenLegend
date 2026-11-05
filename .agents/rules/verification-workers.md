# Managed verification workers

Read before requesting, starting, claiming or using any remote verification machine. [Verification](verification.md#choose-the-execution-location) selects location/checks; [AWS access](aws.md) and [spending](verification.md#spending) apply. Workers are disposable test environments, never production game servers.

## Standard speed-test worker

Use **m7i.xlarge: 4 vCPU, 16 GiB RAM, x86_64, in `us-east-2`, project `027677879749`** for every speed test. Use the managed pool when available, through its matching maintained runner and current claim. Positively verify the actual machine/environment; select a matching available worker, never a hardcoded instance ID. Record the actual hardware and stop/start session because matching instance type alone does not establish a matched comparison.

Only Mike's explicit instruction authorizes a different machine or local speed test. If a required GPU/browser/device measurement is genuinely incompatible with this worker, report the gap and obtain his device choice; do not silently substitute another environment or claim its result replaces or is comparable to the standard baseline. Static/correctness checks retain Verification's existing location choices.

## Current availability

The managed AWS pool and maintained CLI have been delivered separately; their runner code is **not integrated into this checkout**. [VW01–VW04](../../docs/maintainers/verification-workers.md) retain integration and qualification tracking. Existing profilers and temporary task-specific scripts are not a managed pool.

Use that deployment only through its matching maintained CLI and contracts, located from authorized task/deployment records. Read the runner checkout's applicable guidance before invoking it; verify actual pool status and obtain the current experiment's valid claim before use. A stopped or apparently idle instance does not prove availability or ownership. Using the delivered tooling does not require or authorize merging its branch into this checkout.

If a matching maintained runner is unavailable, use an already authorized task-owned AWS instance under its actual ownership, deadline and cleanup rules, or report the gap. A speed-test fallback must positively match the standard machine/environment above; unavailable tooling permits neither different hardware nor local timing. Suitable local non-timing checks can establish correctness only. Do not adopt another task's worker, assume a temporary worker stops instead of terminates, or invent a cloud harness inside unrelated feature work. The design alone does not authorize provisioning.

## Procedure with a matching maintained runner

1. **Plan.** Select the existing check, workload, immutable source, required pass/measurement, timeout, output allowance and cost. Prepare inputs before claiming. For performance use the [profiling procedure](../../docs/maintainers/performance-profiling.md); applicable browser/live-playtest procedures remain. A worker grants no extra tests or paid AI.
2. **Admit and claim.** Review project/Region, source, machine and deadline. Reserve a cloud allocation within the shared task budget; other work cannot spend that allocation too. The controller admits against it and atomically claims the whole worker, including PostgreSQL, for the experiment only. Busy callers wait boundedly or do independent work; no private replacement bypasses the pool cap.
3. **Prepare.** Resume the claimed worker; only the allocator provisions missing capacity within budget. Verify environment/source hashes, checkout-local workspace dependencies, a fresh database, free disk and no foreign workload. Run Git-inventory checks against the exact versioned checkout before packaging; managed source archives contain no `.git`. Reuse tools/cache, never another game's state. Report checkout changes under the root rule.
4. **Execute.** Use the supervised runner with worker ID, generation and run ID; maintain heartbeats. It owns processes, deadlines and logs. No unfenced SSH/SSM launch; diagnostic access retains the same claim.
5. **Collect/release.** Verify required artifact collection outside Git before permitting expiry. Release cleans only owned processes/databases/workspaces; failure quarantines. It returns after cleanup, without waiting through the idle-stop delay. Later stop/reuse and cost status remain collectable; retained EBS still costs money.

An expired heartbeat means **recover or quarantine**, not “free to take.” A former owner cannot affect a later generation. Use runner status/recovery, not manual claim deletion. Lost output and uncertain cleanup remain failures; command completion alone does not prove intended gameplay occurred.

## Reports and implementation changes

Use the [common report contract](../../docs/projects/verification-workers-tech-design.md#measurement-and-artifacts): separate setup, measured work and cleanup, preserve the full phase timeline and actual completed work, and distinguish skipped/unavailable data from zero. Reuse profiler outputs rather than create another measurement system.

Graphics claims use representative visible-browser mode and actual rendered interaction; headless/software diagnostics are separate. When Verification permits a separately located browser, the remote backend leaves browser load on that client and adds network latency; record both.

Before implementing or changing the pool, runner, bootstrap, claims, caching, watchdog or report format, read the complete [feature specification](../../docs/projects/verification-workers-feature-spec.md), [technical design](../../docs/projects/verification-workers-tech-design.md) and affected [VW tasks](../../docs/maintainers/verification-workers.md). Keep operational defaults there, not in game/world policy or copied into agent-specific scripts.
