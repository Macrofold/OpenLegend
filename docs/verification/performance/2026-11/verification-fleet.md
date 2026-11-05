# Eight- and 25-host native verification — November 1, 2026

## Scope and provenance

Mike requested the 8-host stage followed by 25 hosts. Repository `Macrofold/OpenLegend`, remote `https://github.com/Macrofold/OpenLegend.git`; tested source `595207aca9cfb841f93436ccdd7c31a89427f45f` on `codex/verification-workers` in `/Users/mzw/.codex/worktrees/verification-workers/OpenLegend`. Execution moved from `/Users/mzw/.codex/worktrees/4b1c/OpenLegend` (detached at `7ce9c03249385df5f4c84c0ca427cf8b4046bd34`) to that existing checkout; no Git branch/worktree creation or checkout command occurred. Local main and the original checkout are unchanged.

The existing corrected SQL isolation probe was reused with fresh identities, ordinals, fixtures and a finite common start barrier. Each host seeds its owned `game` database, checks its independent `aux` database, uses the real server `PostgresDatabase` adapter and repeatedly sums `generate_series(1,100000)` for 30 seconds. Ordinal zero also verifies that case and PostgreSQL child processes cannot reach EC2 metadata. All jobs assert `AI_BUDGET_USD=0`; no provider grants or model calls are used. No maintained tests were added or automated suite run. This qualifies worker infrastructure, not game population, graphics or model quality.

Raw plans, current pricing/capacity reads, observations and logs remain outside Git under `~/.codex/verification/OpenLegend/evidence/vw10-8-25-20261101/`. Original manifests, source/input archives and collected outputs remain under the corresponding private `workers/campaigns/<campaignId>/` directory and the existing private S3 artifact owner.

## Eight-host result

Campaign `c0a61449-ea96-4e0b-906b-b52c0f0a8187` requested eight jobs/concurrent hosts, durable lifetime, a 1,800-second campaign window, 900-second job timeouts and 4 MiB output per job. Source archive SHA-256 is `90103056991e15f69f0d866e9856ec01a4fb2eed6eebb23b25430226ca8f202b`; input archive SHA-256 is `e6a970a6253647e12472216034b8dd1ee22ed84331a68be18cb289e40ca184c0`.

All **8/8 jobs completed**, with eight distinct instance/slot/run identities, ordinals 0–7 and **16 distinct database names**. All **88 artifact sizes and SHA-256 hashes** were independently verified. Every probe reports the expected fixture and exact source; each performed **2,518–3,016 SQL iterations** over **30.001–30.009 seconds**. The common intersection of all eight reported work intervals is **29.996 seconds**, with a 7 ms start spread. All eight completion receipts report clean process/database cleanup; both metadata probes return curl exit 28.

This is a manual acceptance determination from assertions and collected artifacts; the generic stored result field remains `unassessed`. VM clock offsets were not separately calibrated. All eight environments report tools reused from the selected prepared image; this is not a fresh-tool-install measurement. The deliberate start-barrier wait dominates elapsed runtime and is not useful work or a demonstrated speedup.

| Stage                                    |   Observed time |
| ---------------------------------------- | --------------: |
| Local capacity preflight                 |         2.678 s |
| Source/input packaging                   |         4.441 s |
| Campaign admission                       |         2.375 s |
| Source/input publication                 |         4.649 s |
| Claim to dispatch, per host              | 14.658–65.813 s |
| Source extraction/verification, per host |   1.557–2.277 s |
| Dependency preparation, per host         |   1.622–3.631 s |
| Case cleanup, per host                   |   0.713–1.637 s |

Two existing hosts were reused and six new burst hosts were launched. Required exports are collected. AWS readback confirms **six burst hosts terminated and both reusable hosts stopped**. All eight original lifecycle records confirm those outcomes. The original campaign reconciles and resumes collection with zero incomplete jobs and no experiment replay; all 100 registered slots are available again.

## Twenty-five-host result

Campaign `cd180ac4-32f1-4fde-95c5-fa6e46a0e859` uses the same exact runtime source/archive and execution bounds, 25 jobs/concurrent hosts and a fresh input archive SHA-256 `530ff573580a94830b9619ccd5bf0a6d9c20c634156b0eb6ebc0c7ac21a517d5`. The finite start barrier is five minutes after fixture preparation, compared with ten minutes in the eight-host stage. Neither total elapsed time nor these different waits establish a speedup.

All **25/25 jobs completed**, with 25 distinct instance/slot/run identities, ordinals 0–24 and **50 distinct database names**. All **275 artifact sizes and SHA-256 hashes** were independently verified. Every probe has the expected fixture/source. Hosts perform **2,272–3,017 SQL iterations each**, **70,332 total**, over **30.000–30.011 seconds**. All 25 reported intervals overlap for **29.992 seconds**, with a 10 ms start spread. All 25 completion receipts report clean process/database cleanup; both metadata probes return curl exit 28. As with eight hosts, acceptance is manual artifact analysis; stored acceptance remains `unassessed`, clocks are not calibrated and all environments reuse prepared tools.

The original local watcher exits with **“Controller remains busy; resume the original operation.”** during startup, before experiment dispatch. Its log is last written at `2026-11-01T20:02:07.290Z`; the earliest job dispatch is `20:02:26.064Z`. Authenticated Resume observes/collects the **same campaign**, all 25 results and zero incomplete jobs; no experiment is rerun. This proves recovery, not uninterrupted watcher responsiveness. Preserve the original failure log. A later lifecycle/collection refresh reports `read ECONNRESET` for `native-000`; explicit Collect of the same campaign completes with zero incomplete jobs. No jobs rerun. Unattended startup-contention handling remains an explicit VW10 gap before larger-fleet acceptance.

| Stage                            |   Observed time |
| -------------------------------- | --------------: |
| Local capacity preflight         |         3.743 s |
| Source/input packaging           |         3.899 s |
| Campaign admission               |         2.390 s |
| Source/input publication         |         0.644 s |
| Claim to dispatch, per host      | 39.435–79.904 s |
| Source preparation, per host     |   1.618–2.377 s |
| Dependency preparation, per host |   1.487–3.846 s |
| Case cleanup, per host           |   0.741–8.895 s |

The two reusable hosts retain identical bootstrap timestamps from before both campaigns; those receipt durations are **not fresh boot measurements** for either stage. The eight-host aggregate bootstrap-duration row is therefore excluded. Claim-to-dispatch timings above are current, but per-boot attribution and full cold/prepared measurements remain open in VW10.

Two existing hosts are reused and 23 new burst hosts are launched. Required exports are collected. AWS readback confirms **all 23 burst hosts terminated and both reusable hosts stopped**; all original lifecycle records agree. Final collection reports 25 jobs and zero incomplete results. All 100 registered slots are available again, and both campaigns have no remaining reservation.

## Elapsed time and theoretical serial comparison

The directly controlled campaign begins its capacity preflight at `2026-11-01T20:01:34.441Z`. All useful SQL work ends at `20:07:03.249Z` (**5m28.808s**); the last job is recorded finished at `20:07:14.366Z` (**5m39.925s**). The first successful Resume collection summary is written at `20:08:01.597Z`, approximately **6m27s** after initiation. The last power-state observation is `20:13:06.961Z`, **11m32.520s** after initiation. Power-down includes the funded five-minute reusable-host idle tail; later financial/collection refreshes do not extend experiment runtime.

The useful SQL intervals total **750.108 seconds**, approximately **12m30s** of serial work, versus approximately 30 seconds when overlapped across 25 hosts. The observed parallel elapsed time includes a deliberate five-minute common-start barrier; that wait is artificial coordination, not SQL work, and a serial estimate removes it.

For a theoretical run on one already prepared worker, sum each job's dispatch-to-finish interval after subtracting the entire verifier-start-to-SQL-start interval: **1,087.683 seconds**. Adding the shared local preflight/package/admission/upload once (**10.677 seconds**) gives **1,098.360 seconds**, approximately **18m18s**, before one-time worker readiness and final collection. This retains preparation, SQL, cleanup/export and observed control gaps, but removes unseparated verifier setup along with barrier waiting. Named phases alone yield approximately 16 minutes; neither accounting method is a measured serial benchmark or an empirical bound. Cache behavior, reduced serial contention and missing verifier-prelude attribution can change actual duration. Do not sum all job wall times or multiply the parallel total by 25, since they contain shared/overlapping startup and artificial waits.

## Capacity and funding

Read-only AWS preflight at `2026-11-01T19:36:58.983Z` confirms the selected OpenLegend project `027677879749` in `us-east-2`, active paid plan, 300 standard vCPUs, zero occupied vCPUs, 100 available registered slots, the selected available image, 4,089 available subnet addresses and sufficient gp3 quota. Twenty-five hosts require 100 vCPUs. AWS Pricing GetProducts confirms `m7i.xlarge` Linux shared on-demand at **$0.2016/hour**, excluding IPv4/storage/control costs covered separately by the runner estimate.

Observed occupancy multiplied by the configured **$0.2066/host-hour** compute/IPv4 rate yields approximately **$0.64 for 25 hosts and $1.00 across both stages** ($0.635248 and $1.000475 before rounding). Stop/termination observation can lag the actual transition, so these are conservative runtime estimates. Actual storage/control charges and the settled AWS bill are not separately measured. Model cost is $0.

The shared allocation `vw10-8-25-20261101` initially uses the standing $10 ceiling. Mike then explicitly authorizes spending as needed for 25 hosts. The existing allocation is increased to a bounded **$25 ceiling**, preserving its original eight-host charge and identities; no allowance is reset. The 25-host `2026-11-01T20:01:38.184Z` preflight confirms 300 vCPUs, zero occupied, sufficient storage/subnet capacity and 23 new hosts required.

| Stage             | Original hold | Final allocation charge |  Released | Remaining reservation |
| ----------------- | ------------: | ----------------------: | --------: | --------------------: |
| Eight hosts       |     $3.693091 |               $1.689319 | $2.003772 |                    $0 |
| Twenty-five hosts |    $11.221796 |               $3.200906 | $8.020890 |                    $0 |

Final allocation readback records **$4.890225 charged and $0 reserved**. The charge comprises $1.000475 compute/IPv4, $3.334711 conservative control/transfer margin and $0.555039 funded storage/retention. The latter two are budget-control amounts, not measured actual spend or an AWS invoice. They must not be added again to the compute estimate as an actual bill. Historical financial records, protected outputs and existing funded reusable storage remain intact.

Existing 122-job/four-host evidence remains valid within that scope. The 8/25-host SQL/isolation results do not close [VW10](../../../maintainers/verification-workers.md): startup-contention watcher handling, per-boot measurement and the remaining fault, complete-roster and 100-host criteria remain open. The 100-host run still requires capacity for 400 available vCPUs and its own funding; Cognition Lab integration/live execution remains separate work.
