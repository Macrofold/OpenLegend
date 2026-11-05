# Managed verification workers

Read before requesting, starting, claiming or using any remote verification machine, including an existing one. [Verification](verification.md#choose-the-execution-location) selects location/checks; [AWS access](aws.md) and [spending](verification.md#spending) apply. Workers are disposable test environments, never production game servers.

## Availability and scope

`pnpm verify:worker` implements campaigns with explicit caller-selected concurrency and automatic host assignment. The [execution-location policy](verification.md#choose-the-execution-location) owns the parallel default and user overrides. Default pool capacity remains two; an explicit deployment can configure 1–128 exclusive slots. These are tool configuration bounds, not a universal worker-count recommendation. Configured capacity is not applied AWS quota or demonstrated running capacity: inspect [VW05–VW10](../../docs/maintainers/verification-workers.md) before claiming fleet-scale evidence. [VW01–VW04](../../docs/maintainers/completed/2026/verification-workers.md) retain the foundation qualification. Native jobs force zero paid AI. Explicit paid jobs use the shared executor below; VW09 owns the cognition-Lab adapter and its separate qualification.

Private configuration/state lives under `~/.codex/verification/OpenLegend/workers/`; `OPENLEGEND_VERIFICATION_HOME` overrides this directory, not the physical browser-device claim. Read status before use; tags, stopped instances and expired timestamps never grant ownership.

## Procedure

1. **Plan.** Select an existing trusted entrypoint, exact source, explicit job count/concurrency, fixtures/database aliases, timeout, required artifacts, pass/measurement and cost. Leave campaign time beyond each job timeout for staging and assignment; an equal-length job cannot fit. Prepare inputs before claiming. Performance work follows the [profiling procedure](../../docs/maintainers/performance-profiling.md); relevant browser/playtest instructions remain controlling. A worker grants no extra tests or paid calls.
2. **Admit.** Use `plan PLAN.json` for read-only validation/estimation, then reserve a cloud allocation inside the existing shared task allowance. `run` reserves one complete campaign hold before upload and verifies the selected project/Region, deployed configuration, applied EC2/EBS quotas, image, subnet and complete available slot set. Insufficient capacity/funding refuses admission; never silently lower concurrency or bypass with private machines.
3. **Prepare/execute.** The scheduler assigns jobs automatically, acquires the complete initial capacity, then dispatches through the fenced supervisor. Each job owns its whole host, PostgreSQL and processes until clean export. Each ordered case has fresh source/home/results and declared databases; only its ordered steps share those databases. Reuse tools/content caches, never another job's game state. No unfenced SSH/SSM launches; diagnostics retain the same claim.
4. **Observe/cancel.** Keep an attached campaign's CLI alive for heartbeats; durable campaigns continue under their admitted cloud deadline if the laptop disconnects. Tool polling need not stay attached. `resume` observes original jobs and resumes staging/collection, never experiments. Use `cancel CAMPAIGN`, not a killed CLI, to close assignment and initiate cleanup. Expired/uncertain ownership means recover or quarantine, never steal.
5. **Collect/release.** Verify required artifacts outside Git before expiry. Automatic cleanup stops owned processes, drops owned databases and removes workspaces; failure quarantines. Clean hosts serve queued jobs. At the tail, surplus burst hosts retire; warm hosts stop after the idle interval. Collection/stop metadata remains resumable. EBS/S3/image retention is funded storage, not free idle capacity.

## Current commands and plan

Use the named `openlegend` profile. `allocate TASK --usd AMOUNT --authorization-ref REF` reserves part of that task's existing ceiling; sibling work cannot spend it too. For an explicitly authorized increase, add `--previous-usd CURRENT`; this compares the old amount and preserves charges/reservations. `run PLAN.json` prints the campaign ID and private result directory. One job still uses `jobs[]` and explicit `concurrency: 1`:

```json
{
  "taskId": "assigned-task",
  "cloudAllocationId": "assigned-task",
  "concurrency": 1,
  "deadlineSeconds": 1500,
  "jobs": [
    {
      "id": "standard-profile",
      "mode": "batch",
      "timeoutSeconds": 1200,
      "acceptance": "measurement",
      "cases": [
        {
          "id": "standard",
          "source": "EXACT_40_CHARACTER_COMMIT",
          "steps": [
            {
              "id": "measure",
              "argv": [
                "node",
                "--import",
                "tsx",
                "scripts/performance/profile-server.mjs",
                "scripts/performance/scenarios/mixed.json",
                "{results}/profile.json",
                "300",
                "1",
                "1000",
                "--app-profiling=off"
              ]
            }
          ],
          "env": {
            "OPENLEGEND_PROFILE_WORKLOAD": "standard",
            "OPENLEGEND_PROFILE_PLAYERS": "1",
            "OPENLEGEND_PROFILE_SERVER_WARMUP_SECONDS": "5"
          },
          "requiredArtifacts": ["profile.json"]
        }
      ]
    }
  ]
}
```

Sources are exact 40-character commits. `snapshot DESTINATION PATH...` freezes explicit dirty/new files without switching Git or its real index; use its returned commit and preserve its archive. Packaging uploads each unique source/input once, without a push. Job/case settings remain immutable.

For fixtures, declare campaign `inputs: [{id,root,paths}]`, case `inputs: [{id,bundle}]` and `databases: ["game"]`. A step's optional `database: "game"` binds protected `PG*`/`DATABASE_URL`; `OPENLEGEND_JOB_DATABASES` names the complete owned-alias JSON file. `{inputs}/MOUNT/path` and `OPENLEGEND_JOB_INPUTS` refer to read-only inputs. Use normal authored initializer/import owners for game/Lab seeds; SQL is suitable for data-only fixtures. Export needed results before cleanup. Dependent work stages those exact results in a later campaign; no dependency-graph language exists. Public env contains supported tool settings, never credentials or protected ownership/budget variables.

`status CAMPAIGN` reports a paged roster; `collect CAMPAIGN DESTINATION` verifies/resumes results and emits complete JSON/CSV with original outcomes and failure reasons. Execution can finish before budget settlement: `status` retains the hold until stop/reuse and paid obligations are reconciled; estimated usage is never an AWS invoice. After confirmed hardware closure and the original deadline plus cleanup allowance, unresolved financial monitoring becomes passive; `resume` explicitly reconciles the same record and preserves unknown holds. `cancel CAMPAIGN` requests cleanup; `recover SLOT` handles interrupted claims without replay; `retire SLOT` removes an idle registered host only. Never clear coordination/financial rows manually. Lost required output or uncertain cleanup remains a failure.

For rendered work, use one attached job with `mode: "browser-session"`, first step `["pnpm", "build"]`, then `["node", "--import", "tsx", "scripts/profile-server.ts", "{results}/server.json", "30", "--app-profiling=on"]`. It uses the existing visible local browser and a private SSM tunnel to the fixture's same loopback port. Local Session Manager plugin and Playwright Chromium must be installed; that port must be free. Preserve fixture defaults unless explicitly selecting a public override such as `OPENLEGEND_PROFILE_SPEED`. All maintained captures claim the same physical device across worktrees; `device status` inspects it. Recover a dead owner with `device release OWNER [--confirmed-closed]` only after verifying its original browser is closed. A CPU fleet is not a graphics-device fleet.

Deploy only for infrastructure/configuration/image changes: `deploy CONFIG.json` needs the selected VPC/subnet, Ubuntu 24.04 x86 image, authorization reference and current 24-hour official AWS `priceQuote`. Optional `capacity` defaults to two and does not launch instances. Deployment requires quiescence, preserves financial/required evidence, pauses admission and replaces bundles through the existing owner; do not cancel another agent's work. No deployment per ordinary test and no production game deployment.

`image prepare TASK CLOUD_ALLOCATION EXACT_SOURCE_COMMIT` reserves $2 from that same allocation and builds a clean tools/package-content image on a fresh empty slot. Use `image status BUILD`, `image resume BUILD` and `image retire BUILD`; no experiment is retried. Known capture rejection blocks for explicit resume/cancel. Already submitted capture can return pending after the preparation deadline; observe its original build until completed. Images expire after seven days unless separately funded. Explicit deployment selects the returned image; never snapshot a used experiment host or silently adopt a new image.

## Explicit paid jobs

Read [shared paid execution](../../docs/technical/verification-workers.md#shared-paid-execution) before configuring the service or adding a job’s `paid` declaration. Its persistent PostgreSQL database belongs outside every disposable worker/Lab database and cleanup namespace. Run `pnpm verify:execution /absolute/private/service.json` on a trusted service host; provider credentials stay only in that process. An independently hosted executor is required for paid work to survive loss of the submitting laptop. A local executor is suitable for attached work and controlled qualification, without that availability claim.

Configure the worker CLI with `execution configure /absolute/private/endpoint.json` (`url` and `adminToken`, HTTPS); this saves private control configuration under the existing verification home. `execution status` reads permitted lanes/capacity without model calls. The CLI reserves cloud plus paid allowances against the same task cap before creating service grants. Neither a provider key nor the control credential belongs in a plan, input bundle, job environment or artifact. Native jobs still force `AI_BUDGET_USD=0`; paid programs explicitly consume `OPENLEGEND_JOB_EXECUTION` through `loadJobExecutionClient()` or the maintained `execute-ai.ts` entrypoint. The service owns spending; a local Lab budget is not replacement financial authority.

Job/campaign cancellation closes its grants without replay. Observing an original attempt may reconcile its original receipt, but never submits another paid request. Unknown completion/pricing retains its hold. A clean EC2 host can be released independently of provider uncertainty; uncertain local commands/processes still quarantine it. Native world-tool harness execution is not admitted by this model-only interface; it retains its existing game/permission owner.

## Reports and framework changes

Use the [report contract](../../docs/technical/verification-workers.md#measurement-and-artifacts): separate packaging, upload, capacity/boot/install/cache, actual work, transfer and cleanup. Preserve failures/full roster and actual completed work; unavailable is not zero. Reuse existing profiler outputs. Graphics claims need named representative device, rendered interaction and network conditions; a remote backend still consumes local graphics resources and adds latency.

Before changing pool/runner/bootstrap/claims/cache/watchdog/report behavior, read the [worker feature](../../docs/features/verification-workers.md), [technical contract](../../docs/technical/verification-workers.md) and affected [VW tasks](../../docs/maintainers/verification-workers.md). Fan-out, image and portable input changes also read the [campaign feature](../../docs/projects/verification-campaigns-feature-spec.md) and [technical design](../../docs/projects/verification-campaigns-tech-design.md). VW08’s typed paid boundary and VW09’s [Lab planner/executor](../../scripts/cognition-lab/README.md) are implemented; their trackers distinguish generic-worker evidence from Lab-specific qualification. Keep operational tuning here/with its owners, outside game/world policy.
