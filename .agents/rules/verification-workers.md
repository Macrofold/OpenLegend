# Managed verification workers

Read before requesting, starting, claiming or using any remote verification machine, including an existing one. [Verification](verification.md#choose-the-execution-location) selects location/checks; [AWS access](aws.md) and [spending](verification.md#spending) apply. Workers are disposable test environments, never production game servers.

## Standard speed-test worker

The standard machine for speed tests is **m7i.xlarge: 4 vCPU, 16 GiB RAM, x86_64, in `us-east-2`, project `027677879749`**. Use the managed pool when available, through its matching maintained runner and current claim. Verify the actual machine and environment. Select an available matching worker through the pool. Record the hardware and stop/start session because matching instance type alone does not establish a matched comparison.

For player-visible browser checks, Mike approves his **Apple M1 Pro Mac during normal use**, including while other applications are active. Keep the measured game server on the standard AWS worker. The attached-browser workflow opens the visible local browser through a private tunnel to the worker and its disposable Rust game. Record the Mac, browser and version, graphics backend, display settings (including viewport and scale), competing load and network path. For comparisons, repeat the relevant conditions and disclose changes that limit the result. Report client rendering and input-to-visible time separately from isolated server timing. Client-to-server communication includes the network and tunnel delay. Identify any part of that delay you could not measure separately.

Where a browser is available on a CPU-only AWS machine, use it for functional outcomes such as whether a command updates the screen. An accelerated graphics claim needs actual rendered play on a representative graphics device. The maintained runner supports three CPU machine profiles. Verify the deployed runner's capabilities before planning another setup. For another client device, reuse Mike's recorded approval within its scope or obtain his choice. A different server instance type or a local server speed test still requires Mike's explicit instruction. Static and correctness checks follow Verification's location rules.

## Current availability

Use `pnpm verify:worker` from this Rust game checkout after `pnpm install --frozen-lockfile`. The managed bootstrap uses Node 24.13.0, and the local runner also works on Node 22.23.2. The runner was imported from local `codex/nrf-worker-disk-guard` at `b4c8f5d14235b89ae5629867b3fcedc4023144ba`. The active deployment may advance independently. Verify its controller and bootstrap against the [deployment record](../../docs/maintainers/verification-workers.md) before using it. An instance can be stopped while another task still owns it.

### Current commands

Use the [Open Legend AWS profile](aws.md) and the existing private pool configuration. For current gameplay, [freeze a Rust campaign](../../docs/maintainers/performance-profiling.md#stand-alone-rust-campaigns), then use `pnpm verify:worker` with the following commands.

| Command                                              | Purpose                                                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `plan PLAN.json`                                     | Validate and estimate a frozen campaign before admission. One job still uses `jobs[]` and explicit `concurrency: 1`.      |
| `allocate TASK --usd AMOUNT --authorization-ref REF` | Register the authorized share of the task budget under its exact task ID.                                                 |
| `run PLAN.json`                                      | Verify capacity, reserve funding, stage sources and run the original jobs. Keep the command alive for attached campaigns. |
| `status CAMPAIGN`                                    | Read the original campaign's progress, outcomes and outstanding holds.                                                    |
| `resume CAMPAIGN`                                    | Resume observation or collection of the original campaign.                                                                |
| `collect CAMPAIGN DESTINATION`                       | Verify and retain original results outside Git.                                                                           |
| `cancel CAMPAIGN`                                    | Close assignment and initiate owned cleanup.                                                                              |

Sources are exact 40-character Git commits. Leave time for staging and assignment beyond each job timeout. An authorized allocation increase uses `--previous-usd CURRENT` and preserves prior commitments. `snapshot DESTINATION PATH...` freezes explicitly selected dirty/new files, with its own source identity. The runner packages each unique source/input once without a push. Each case has fresh source, home and results directories and its own declared databases. Use `databases: ["game"]` for an owned database and select it in a step with `database: "game"`. Protected connection variables come from the runner. Read-only inputs are selected by campaign bundle and mounted under `{inputs}`. Reuse collected, verified output in a later campaign when another step depends on it.

Batch campaigns support 1–128 exclusive workers with a default configured capacity of two. Check live quotas, available slots and the shared budget before admission. An attached `browser-session` runs one signed Rust game and reserves one physical browser. Use the [Rust browser capture procedure](../../docs/projects/verification-workers-tech-design.md#remote-browser-integration) for its prepared inputs, retained results and qualification. `device status` inspects the shared physical browser claim. A dead owner can release it with `device release OWNER [--confirmed-closed]` after its browser has closed.

`recover SLOT` and `retire SLOT` operate on owned workers. A stopped quarantined worker needs the exact claim, independently verified evidence and approved retirement receipt in the [retirement procedure](../../docs/projects/verification-workers-tech-design.md#closeout-of-the-two-stopped-november-failures). Ordinary jobs use the deployed pool. Keep private runner state and capabilities under `~/.codex/verification/OpenLegend/workers/` or the explicit `OPENLEGEND_VERIFICATION_HOME`; the physical browser claim remains shared across checkouts.

If the managed pool is busy, use its bounded wait or do independent work. If the matching runner is unavailable, an already authorized, task-owned AWS instance may be used under its existing ownership, deadline and cleanup rules. For timing it must match the standard machine and environment. Otherwise record the missing evidence. Do not create a substitute pool, take another task's worker or assume a temporary worker will stop instead of terminate. Suitable local non-timing checks can still establish correctness.

## Procedure with a matching maintained runner

### Parallel comparisons and reuse

One task owner coordinates admissions across agents. Run independent ready experiments on separate standard workers when live capacity and the shared budget permit. Report the specific dependency, capacity or budget limit when experiments must run in sequence.

Keep each comparison's interleaved repetitions on one assigned worker. Keep comparisons that reuse a control on the same worker under the [experiment planning rules](../../docs/performance/measurement.md#planning-comparisons). Use the runner's concurrency and worker-affinity settings, exclusive processes and PostgreSQL, and fresh case databases. Freeze the plans before dispatch.

After verified cleanup, admit a ready successor through the controller. There is no need to wait out an idle timer. A stop or start already underway still blocks a claim. Retain outstanding cost reservations until reconciliation.

Reuse qualified tools and build artifacts under the [build identity contract](../../docs/projects/verification-workers-tech-design.md#verified-build-reuse). Cache implementation and qualification are tracked in [VW02](../../docs/maintainers/verification-workers.md#delivery-order); a slow preparation step does not authorize an ad-hoc runner or a relaxed source check.

### Run lifecycle

1. **Plan.** Select the existing check, workload, immutable source, required outcome, timeout, output allowance and cost. Prepare inputs before claiming. For performance comparisons follow [experiment planning](../../docs/performance/measurement.md#planning-comparisons). When using the game's existing profilers, consult their [tool-specific instructions](../../docs/maintainers/performance-profiling.md). Apply browser or live-playtest procedures when the selected check calls for them. A worker grants no extra tests or paid AI.
2. **Admit and claim.** Review project/Region, source, machine and deadline. Reserve a cloud allocation within the shared task budget; other work cannot spend that allocation too. The controller admits against it and atomically claims the whole worker, including PostgreSQL, for the experiment only. Busy callers wait boundedly or do independent work; no private replacement bypasses the pool cap.
3. **Prepare.** Resume the claimed worker; only the allocator provisions missing capacity within budget. Verify environment/source hashes, checkout-local workspace dependencies, a fresh database, free disk and no foreign workload. Run Git-inventory checks against the exact versioned checkout before packaging; managed source archives contain no `.git`. Reuse tools/cache, never another game's state. Report checkout changes under the root rule.
4. **Execute.** Use the supervised runner under the current worker ID, claim generation and run ID. It owns the processes, deadlines and logs. Follow the selected campaign mode's heartbeat rules. For example, an attached campaign needs its CLI alive. A durable campaign continues under its admitted cloud deadline. Diagnostic access must also respect the claim. Do not launch work directly through SSH or SSM.
5. **Collect and release.** Confirm that the runner exported the results and cleaned up the processes, databases and workspaces owned by this run. Failed cleanup quarantines the worker. Verify the required artifacts and their checksums outside Git before permitting expiry. Apply the [verification record and scratch rules](verification.md#run-and-report-the-selected-checks) to the submitting machine after collection. Retrieve the later stop, retirement or reuse status and reconcile costs. Report the runner's estimated usage and outstanding holds separately from any invoiced charges. Release returns after cleanup, while retained storage can still accrue charges.

If the submitting client disconnects, inspect the original campaign and use the matching runner's resume or collection command. Preserve its frozen inputs, completed and failed cases, reservations and remaining work. Starting a new campaign cannot recover the old one. If a lease expires, use the runner's recovery or quarantine procedure. A former owner cannot operate under a later claim. Lost output and uncertain cleanup remain failures. Verify that the intended gameplay occurred even when every command exited successfully.

When a [proven common blocker](../../docs/performance/measurement.md#planning-comparisons) prevents the required work, withhold the affected repeats that have yet to be submitted. For queued work, use the matching runner’s supported cancellation. Cancellation acts on an entire campaign and can interrupt active jobs. Keep its manifest intact. Collect and reconcile completed, interrupted and never-started cases. Keep independent campaigns running. If a cancelled campaign included useful independent work, schedule its outstanding comparisons with their matched conditions and budget after reconciliation.

## Explicit paid jobs

Read [shared paid execution](../../docs/technical/verification-workers.md#shared-paid-execution) before configuring the service or adding a job’s `paid` declaration. Its persistent PostgreSQL database belongs outside every disposable worker/Lab database and cleanup namespace. Run `pnpm verify:execution /absolute/private/service.json` on a trusted service host; provider credentials stay only in that process. An independently hosted executor is required for paid work to survive loss of the submitting laptop. A local executor is suitable for attached work and controlled qualification, without that availability claim.

Configure the worker CLI with `execution configure /absolute/private/endpoint.json` (`url` and `adminToken`, HTTPS); this saves private control configuration under the existing verification home. `execution status` reads permitted lanes/capacity without model calls. The CLI reserves cloud plus paid allowances against the same task cap before creating service grants. Neither a provider key nor the control credential belongs in a plan, input bundle, job environment or artifact. Native jobs still force `AI_BUDGET_USD=0`; paid programs explicitly consume `OPENLEGEND_JOB_EXECUTION` through `loadJobExecutionClient()` or the maintained `execute-ai.ts` entrypoint. The service owns spending; a local Lab budget is not replacement financial authority.

Job/campaign cancellation closes its grants without replay. Observing an original attempt may reconcile its original receipt, but never submits another paid request. Unknown completion/pricing retains its hold. A clean EC2 host can be released independently of provider uncertainty; uncertain local commands/processes still quarantine it. Native world-tool harness execution is not admitted by this model-only interface; it retains its existing game/permission owner.

Freeze Rust Lab episodes through the [Cognition Lab campaign runner](../../scripts/cognition-lab/README.md). Native jobs default to zero funded AI calls.

## Reports and implementation changes

Use the [common report contract](../../docs/projects/verification-workers-tech-design.md#measurement-and-artifacts): separate setup, measured work and cleanup, preserve the full phase timeline and actual completed work, and distinguish skipped/unavailable data from zero. Reuse profiler outputs rather than create another measurement system.

When designing a worker change, read the affected sections of the [feature specification](../../docs/projects/verification-workers-feature-spec.md) and [technical design](../../docs/projects/verification-workers-tech-design.md), and the [worker task](../../docs/maintainers/verification-workers.md) that owns it. This includes a proposed new bootstrap file. Before implementing changes to the pool, runner, bootstrap, claims, cache, watchdog or report format, read both specifications in full and the affected tasks. Keep operational defaults in the worker contract. Changes to fan-out, input bundles, clean images or paid campaigns also follow the [campaign feature](../../docs/projects/verification-campaigns-feature-spec.md) and [campaign design](../../docs/projects/verification-campaigns-tech-design.md).
