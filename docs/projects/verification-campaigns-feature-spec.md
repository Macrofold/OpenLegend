# Parallel verification campaigns — feature specification

| Status      | Current progress                                                                                                             | Last updated |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Lab and ordinary-game adapters are implemented; original collection, managed qualification and fleet acceptance remain open. | 2026-11-05   |

Last synchronized with implementation: `2026-11-05T07:42:00Z`.

## Purpose and current boundary

Run many independent development experiments concurrently without occupying Mike's computer, mixing their state or losing spending control. A campaign can contain different checks, database seeds, fixtures, sources and settings. Generality comes from trusted repository entrypoints and explicit input files, not a cognition-specific orchestration engine.

The native runner uses this campaign interface, including ordered steps, input bundles and isolated databases. A 100-slot controller is deployed; 25-host native SQL/isolation evidence and the remaining fleet gate are recorded in the [VW05–VW10 checks](../maintainers/verification-workers.md). Native source inspection and template generation do not qualify 100 running hosts or live cognition. VW08 shared paid execution is implemented and qualified. The [portable Lab adapter](../../scripts/cognition-lab/README.md) is implemented; its corrected managed-worker qualification remains VW09's acceptance boundary.

## Selected target

- Submit one immutable manifest containing independently identifiable jobs. Each job declares its exact source, input bundles, ordered setup/check steps, database aliases, required artifacts, execution deadline and resource/spending requirements. A job may seed a database, run a native profile or execute an isolated live cognition episode through the maintained adapter.
- Keep default worker capacity at **two**; require explicit `concurrency` for every campaign. Support explicit configured capacity through **128** exclusive workers: 100 jobs can run concurrently when admitted, or all 122 can when capacity, quota, provider access and funding permit. Job count is independent of parallelism; extra jobs wait durably.
- Require the requested capacity before starting any job; insufficient capacity blocks explicitly. The scheduler assigns jobs automatically, with no caller-to-instance mapping. For 122 jobs and concurrency 100, workers take the first 100 and then the queued 22 as capacity frees. Release surplus hosts once the pending queue is empty.
- Reuse a small stopped cache of prepared workers. Create temporary burst workers for a large campaign and terminate them after clean export. Do not retain 100 seven-day disks merely because 100 jobs were requested. A prepared image and shared immutable source/input uploads avoid repeating installation and local packaging for every job.
- Give each job an exclusive host, fresh source workspace, fresh declared databases and isolated home/output paths. Ordered cases within a job retain their before/after comparison meaning. Different jobs never share a mutable Lab, current world, database, filesystem lock or receipt namespace.
- Native execution remains zero-provider-spend by default. A live job requires an explicit funded provider grant and the shared paid-execution owner described in the technical design. Every provider, hosting and recovery commitment belongs to the same assigned-task ceiling; a job or worktree is not another allowance.
- A durable campaign may finish after its submitting laptop disconnects, within its original immutable deadline and budget. Attached execution remains available for browser sessions and deliberate owner-loss cancellation. Reconnection observes the original jobs; it does not replay them.
- Produce one indexed campaign report with every planned job, including queued, blocked, failed, interrupted and uncertain work. Preserve each original artifact/receipt and distinguish completed commands from demonstrated acceptance. Independent job failures continue by default; stop on source/infrastructure integrity, lost accounting or an exhausted shared allowance.

## The cognition-lab case

Read-only inspection of local `codex/cognition-lab` at `2977167c267222f514d0d9b3f8e8032f15041bc9` found **122 matrix positions**: 108 primary positions (54 conditions × two models), plus 14 established-work controls (seven × two). This is a historical result matrix, not a currently approved new execution roster. Some results deliberately reuse earlier equivalent observations; parallelization grants no permission to rerun paid or uncertain attempts.

The historical private runner executed episodes serially against one host and its attempt ledger. The [campaign report on the inspected revision](https://github.com/Macrofold/OpenLegend/blob/2977167c267222f514d0d9b3f8e8032f15041bc9/docs/verification/cognition-lab/2026/2026-10-29-final-native-panel.md#reuse-scope-and-execution) records this limitation: twelve episodes took 10 m 44.277 s, including 50.404 s between episodes. This does not establish a speedup estimate for new concurrent Lab execution.

The adapter exports an explicitly selected roster with stable row IDs, exact current-format origin bundles, source/model/effort/output settings and original wall/simulation/call limits. Plan-only coverage accounts for all 122 positions without buying new inference. Each selected runnable row becomes an isolated job; blocked and unselected positions remain in the index. Native actions and multistep conversations inside a row remain sequential. Assessment references remain outside model inputs. The existing CSV and historical grades/receipts stay unchanged; a new campaign has its own evidence and execution-concurrency conditions.

**Comparison design specified 2026-11-05T00:50:12Z; implemented under CL13/CTR08.** Bounded qualification and remaining limits are [recorded](../verification/cognition-context/2026/2026-11-05-readiness-and-admission.md). The same adapter distinguishes controlled Lab episodes from ordinary-game episodes without Lab processing holds. Both use declared isolated origins, ordinary permissions and shared accounting; clock-only comparisons retain the same participants, settings and stimuli. Mechanical arrival and work completion use native outcomes independently of character replies, while later provider settlement and export remain outside the primary gameplay interval. The [technical contract](verification-campaigns-tech-design.md#71-ordinary-runtime-comparison) owns the exact target and evidence requirements. This is a diagnostic execution target, not a new player-facing game mode or a replacement for VW09’s remaining acceptance.

## Agent journeys

**Many independent checks:** plan 122 jobs, inspect prerequisites and the total reservation, choose eight workers initially or explicitly request 100/122, submit once, then observe progress or disconnect in durable mode. Idle workers take the next eligible job without rebuilding tools. Slow jobs do not hold up unrelated jobs.

**Fixture or seed work:** provide a repository seed entrypoint and an explicit fixture bundle. The runner injects only job-owned database handles. A seed-only job publishes a declared reusable output before cleanup. Dependent experiments start in a subsequent campaign using that exact output reference; no workflow-graph language is introduced.

**Live model comparison:** reserve compute and provider sub-budgets, verify actual service capacity and use the same shared financial owner across isolated Labs. Start only as many episodes as their declared provider lanes can support. Queueing, rate limits and unknown receipts are reported separately from character reasoning quality.

**Interrupted campaign:** cancel closes new assignment and undispatched paid admission, then stops owned work. Lost/stale worker authority cannot free a slot. Individual request cancellation also prevents later execution or value delivery under that identity after restart. Resume preserves completed jobs and observes uncertain ones; only explicitly authorized fresh attempts may execute again. Unknown funds remain reserved after automatic monitoring ends; a later Resume can reconcile receipts and collect preserved output without rerunning jobs.

## Acceptance and delivery

[VW05–VW10](../maintainers/verification-workers.md) own implementation and qualification. Required passes include heterogeneous seeds/checks, actual isolation, durable queueing, atomic ownership under concurrent callbacks, bounded control/collection work, loss/cancellation recovery and aggregate funding. Native qualification must demonstrate 122 distinct jobs and a funded 100-worker concurrent run before claiming that capacity; measured speedup is reported, not presumed. Test 8 then 25 workers first to find control-plane or preparation bottlenecks before the expensive qualification.

VW09's remaining [Lab qualification](../verification/performance/2026-11/verification-lab-adapter.md) must prove zero-model preparation and two concurrent isolated episodes using real shared admission/receipts, verified outputs and cleanup. The adapter's supported typed model paths and harness exclusions are explicit in the [technical contract](verification-campaigns-tech-design.md#7-cognition-lab-adapter). A fresh complete 122-position paid campaign requires its own approved roster/funding and available provider capacity. Generic native or injected-model evidence cannot close the Lab gate. New test authoring still follows Mike's instruction; existing tools and disposable qualification scenarios suffice unless otherwise requested.

No new gameplay/world rules, shared-host performance measurements, GPU/device fleet, arbitrary job dependency graph, Kubernetes or automatic paid retries are part of this project. AWS Batch/containers are alternatives if later operating evidence justifies replacing the existing native supervisor; they are not a second implementation here.

## Maintained records

- Implementation: [VW05–VW10](../maintainers/verification-workers.md); foundation evidence remains [VW01–VW04](../maintainers/completed/2026/verification-workers.md).
- Mechanism and operational limits: [Technical design](verification-campaigns-tech-design.md), including its defaults. These are development-infrastructure restrictions, not world laws or gameplay limits.
- Use/routing: [Worker procedure](../../.agents/rules/verification-workers.md); current worker [feature](../features/verification-workers.md) and [technical](../technical/verification-workers.md) contracts.
- Open product decisions: None. Applied AWS quotas, reachable authorized provider service, current prices and actual campaign funding remain execution preflight facts, not assumed availability or spending authorization.
