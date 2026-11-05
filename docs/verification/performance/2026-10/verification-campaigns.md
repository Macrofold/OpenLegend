# Native verification campaigns — October 31, 2026

## Scope and provenance

Repository `Macrofold/OpenLegend`, remote `https://github.com/Macrofold/OpenLegend.git`; approved design base `703b211a22617bcbb6df1c92d22a7182c4927108`. Edits remain in `/Users/mzw/.codex/worktrees/verification-workers/OpenLegend`, branch `codex/verification-workers`; the original checkout/local main are unchanged. [VW05–VW10](../../../maintainers/verification-workers.md) own unfinished acceptance. No unit suite or new maintained tests; disposable native probes use real PostgreSQL and the existing server database adapter. No model calls: scoped/cumulative Jev cost **$0**. Mike selected the worker framework only; live provider/Lab integration remains future work.

The task ceiling was explicitly raised from $10 to $100. Cloud reservations and conservative terminal charges are not AWS invoices. Preserve existing financial rows; increasing an allocation compares its previous ceiling and retains all charged/reserved amounts.

## Initial roster and recovery

Campaign `678dcf9c-b354-48e5-aec7-129cb52f10a4` used source `13674b448356a1d68a19111c95706deb54496ccb`, 122 distinct jobs, explicit concurrency four, durable lifetime, 4 MiB output/job and two fresh database aliases/case. Each seeded its own ordinal, queried it through `PostgresDatabase`, checked the second database was independent and exported its identity/timestamps. All requested initial instances were acquired before dispatch. The first four probes had an absolute start barrier; later probes were short. This is infrastructure/isolation evidence, not game capacity or model quality.

All 122 jobs reached terminal states and all 122 checksum exports were collected: **121 completed, one fixture failure**. The first probe's extra PostgreSQL metadata-isolation check imported `pg` from the repository root instead of the server workspace; its corrected explicit workspace import needs a fresh execution identity. Other jobs continued. Three initial jobs performed actual SQL work together after the barrier; this failed specimen does not establish four-way measured-work overlap or a successful complete roster.

A transient DynamoDB transaction conflict ended the watcher. Cloud-owned execution continued; `resume` observed the original identities and completed collection without replaying jobs. A later warm assignment had 41.112 seconds between claim and dispatch; that interval is scheduling/control delay, not SQL or game time. Shared coordination now handles lock contention as busy and retries only definite effect-free metadata transaction conflicts with bounded backoff. Unknown writes/SSM execution are not retried. This correction requires the subsequent qualification.

| Measured boundary                                  | Initial result                                                  |
| -------------------------------------------------- | --------------------------------------------------------------- |
| Local live-capacity preflight                      | 1.243 s                                                         |
| One unique source/input packaging                  | 5.111 s                                                         |
| One unique source/input staging                    | 6.079 s                                                         |
| Admission                                          | 1.114 s                                                         |
| Cold OS/tool bootstrap                             | 31–34 s on the four hosts; boot/start and dispatch are separate |
| Source archive                                     | 23,378,418 bytes; four initial downloads                        |
| Worker archive reuse                               | 236 hits / eight misses across source and fixture reads         |
| Later short jobs (118 jobs)                        | Median 9.547 s, p95 10.528 s from claim to finish               |
| Source extraction/verification, later jobs         | Median 1.665 s                                                  |
| Fresh workspace dependency preparation, later jobs | Median 1.602 s; installed tools/packages are reused             |

The barrier deliberately held three hosts while the failed first probe's host processed later jobs. Total wall time therefore is not a four-worker speedup benchmark. The [foundation report](verification-workers.md) retains actual five-minute game and rendered-browser evidence; these SQL probes do not replace it.

Duplicate admission observed the same campaign with unchanged total financial commitment ($6.050950); changed manifest fingerprint and an older job's heartbeat were refused. Two simultaneous local browser-device claims produced exactly one owner; release restored availability. This proves device arbitration, not rendered performance. Both burst hosts were confirmed retired after terminal cleanup; two warm caches remained registered.

Private raw material: `/tmp/ol-campaign-verification/`; complete initial exports under `~/.codex/verification/OpenLegend/workers/campaigns/678dcf9c-b354-48e5-aec7-129cb52f10a4/results/`. Preserve their original failures/receipts.

## Corrected native roster

Campaign `f52c1ac4-c1e5-4671-8233-2ec0bb38bc32` used source/controller `245d191bf90c4e6471ac242be0ab3c6159d90a0c`, the deployed **100-slot** registry and four physical workers. All **122 jobs completed and all 122 exports were checksum-collected**, with **244 distinct owned database names** and no incomplete rows. The same roster kept explicit native assertions and the corrected workspace-scoped driver import. The watcher completed without another surfaced transaction-conflict failure.

The first four hosts performed SQL work for a timestamped **9.995-second overlap** (VM clock offsets were not separately calibrated). The ordinary case process and PostgreSQL-side process both failed to reach metadata with curl exit 28; an HTTP 401 would have failed this check rather than masquerading as network isolation. Root supervisor AWS calls remained operational. This qualifies the shared process/database boundary for the existing channel; it is not a hostile-code sandbox claim.

Later short jobs had median 9.392 s/p95 11.185 s claim-to-finish. Claim-to-dispatch was median 0.500 s/p95 1.167 s; extraction/verification, installation, work and publication remain separate in raw timelines. Archive reuse remained 236 hits/eight misses. Local live preflight, packaging, staging and admission took 3.982/4.021/7.308/4.873 s respectively. This is a four-worker workload against a 100-slot registry, not 100-worker callback-rate acceptance or a controlled speedup study.

Cloud commitment for this campaign: **$2.037426**, in addition to the first campaign's **$6.050950** conservative charge. The same allocation now has a $95 ceiling and retained its original charge plus the explicit authorization adjustment; $5 remains setup headroom within the approved $100 task ceiling.

## Portable inputs, cancellation and image preparation

Campaign `c2d3da40-db64-44a9-8683-6f747f49e304` completed an ordered exact/dirty comparison with distinct `fixture-a`/`fixture-b` inputs, two independent databases per case and the existing configuration check. Dirty source `95249998a02ec6979551ed0c8c3970f2a637d960` was retained as a collected archive. A declared unused input root did not exist and was not read. Its second job performed a seed-only SQL export before cleanup; all declared outputs were collected.

Campaign `5d640907-4692-4bd9-ad2e-1a4383f10636` intentionally changed its own archived README. The source guard reported `integrity`, refused the following step and closed the queued job as **not-started**. This expected failed scenario did not stop the concurrent comparison or image work.

Attached campaign `fc433c30-03b4-44b2-aa1b-75c04627546f` lost its submitting process at 19:37:12 UTC during a long-running child. Its operator lease expired at 19:40:01.309; cloud cancellation began 5.318 s later. The clean interrupted receipt was timestamped 19.578 s after lease expiry and the controller finalized it at 20.763 s; the pending job remained not-started. A subsequent heartbeat did not extend/revive the lease. Both roster outcomes and collected logs preserve the interruption.

Image build `eb493c1b-12e3-477b-a948-2dc16be93073` installed/sealed a fresh slot. Pnpm package fetch took 2.451 s; the seeded store was 306,680,290 bytes. AWS refused the controller's original image capture because its policy omitted snapshot creation resources. Under the same image/worker fences, stopped-instance check and exact sanitization receipt, operator recovery completed that definitely rejected original capture; it did not clear metadata, recreate the build or add a reservation. The original owner observed image `ami-052a1431a897ec8b4`, snapshot `snap-0c51eee145c2c0b2b`, terminated its builder and charged the original $2 estimate. AWS snapshot copying took about fourteen minutes with compute stopped. This recovery is not a fully managed capture pass; the corrected policy and blocked/resume path require the fresh managed build below. Already submitted capture can outlast active preparation; pending observation is not failure or completion.

The subsequent fully managed build `c4121087-16bd-404d-9e6f-2ba62008dbea`, source `1798278e8f4170d29c357990b0be09f1e3938efb`, completed in **208.262 s**, including image availability and confirmed builder termination. It produced selected image `ami-077175468bfa91411` and snapshot `snap-07642f1fb4433978e`. The intermediate recovery image and snapshot were retired through their original owner. The selected clean image retains its funded seven-day expiry. No experiment host was imaged.

Fresh restored campaign `f4173ddb-9989-49c4-ba6a-2665a12bc256`, source `ec31ef6d1a58a0d01d12789aff6724e84300c828`, completed and collected its SQL-generated seed. Its environment recorded **tools reused**, pinned pnpm 10.33.0 and 15.341 s of boot preparation; this is not total machine-claim latency. The shared boot gate waits for this instance’s cloud-init completion rather than trusting the baked installation receipt. The seed from the earlier restored campaign `fc6b2f63-907b-4f50-b175-2cfaec78c144` was packaged as an explicit read-only input for the browser consumer.

Source/input staging now charges captured bytes before upload. Actual duplicate admission reused the same 4,509-micro-USD staging receipt and original charge timestamp; changing its fingerprint was refused. A deliberately unaffordable request was rejected before transfer. These are conservative charged estimates within the same task allocation, not another budget or an AWS invoice.

## Publication recovery and rendered consumer

Source/controller `a35fb350d3f8bc4f88c794d46b1f1cbef46882b2` passed the stop/claim boundary. Native seed campaign `331186da-dc08-4391-9401-f4e0ef6c90f9` completed and collected. A fenced disposable fault then stopped its exclusively idle registered instance `i-01b09c8e948800fe5` at 20:34:59.207 UTC while leaving its registry available, reproducing a host-local stop in flight. Browser campaign `bb715310-e9a0-424d-a737-2d4cd61d207f` claimed that same instance at 20:35:09.309 and dispatched 43.654 s later. It completed and checksum-collected the seed consumer, production build, existing browser/server profiles and screenshot. Idle power intent now serializes with allocation; claim/dispatch waits through stopping and starts the same stopped machine, rather than quarantining a healthy cache. A prior attempt (`fc135e4c-8b18-4689-814e-ce99baa58d1c`) preserved the original stopping-race failure and was recovered without replay.

The visible 1920×1080 Chromium 145 capture reported Apple M1 Pro/ANGLE Metal. It accepted **19/19 movement commands**, no uncaught browser errors and three eligible input-to-displayed-motion samples: median **594.3 ms**, maximum **939.2 ms**. Rendered submission intervals were p50 **8.5 ms**, p95 **16.25 ms**, p99 **24.25 ms**, maximum **218 ms**. The browser collected 33.731 s; the acknowledged server interval was 30.002 s. Clock offsets were not calibrated. The laptop was heavily loaded (one-minute load about 129); five asset requests failed as in the foundation fixture and some state requests aborted. The inspected screenshot contains the rendered scene/player interface. Browser closure, device release and verified collection succeeded. These observations qualify orchestration and measured interaction, not quiet-device graphics, complete assets or physical display presentation.

The game fixture retained its **3× default** and made no paid/model calls. It achieved only **0.319× normal speed** (575 game seconds in 30.002 real seconds) with no server failure/storage error. This is a poor gameplay-speed measurement, preserved rather than treated as a framework speedup. Game runtime optimization is outside this assignment.

Durable campaign `572650b9-372c-40df-8a2b-67f8cc17d783` exposed an actual partial publication at 20:39:47.391 UTC: **20/21 rows staged, zero active jobs, capacity not ready**. Its submitter was stopped there. Cloud publication continued and `resume` used the original campaign/job identities; all **21/21 original jobs completed and were checksum-collected**, with their original manifest. New disposable boundary checks refused missing concurrency, equal job/campaign windows, escaping/protected/linked/oversized/changing inputs and oversized job metadata before execution. The unchanged physical SSM/create uncertainty, independent shutdown and foreign-process cleanup cases retain their [foundation evidence](verification-workers.md#ownership-failure-and-source-checks); they were not relabeled as fresh 100-host tests.

## Fleet readiness and remaining evidence

Applied standard EC2 quota is **16 vCPUs**. Mike authorized 400; request `f2cc4895257143109ddcff2d97cb6f69PSzCqw41`, case `179347119700933`, remains open. Actual 8/25/100-host work, service/callback throughput, fleet failure isolation and cold/prepared speedup remain blocked until the applied quota permits them. No silent smaller run qualifies that requirement.

Current generated capacity 100 has **210 resources/143,138 bytes**; capacity 128 has **266 resources/180,238 bytes**. Controller inline-policy encoding is **4,553 bytes** and environment encoding at most **566 bytes**. These are structural bounds, separate from deployed permissions and physical-fleet acceptance. Existing type/config/network/guidance checks, affected formatting, bundle/template validation and native consumers passed; no unit suite/new maintained tests. Structural guidance validation is not installed-agent routing evidence (CG05).

VW05–VW07 native implementation/evidence is complete within the demonstrated four-host scope. VW10 retains the quota-blocked larger fleet checks. VW08–VW09 are expressly future provider/Lab integration, outside this framework assignment. Required output is collected outside Git, original failures/financial receipts remain intact, and no push/merge or game-default change was performed.

## Resource and spending disposition — 20:43:57 UTC

The cloud allocation retained its **$95** ceiling, **$18.008711** conservative charged estimates and **$0** reserved, leaving **$76.991289** available within that allocation; $5 remains setup headroom under the approved $100 task ceiling. These figures are allocation accounting, not a settled AWS bill. Scoped/cumulative Jev cost remains **$0**. No 8/25/100-host reservation was admitted while the quota was insufficient.

There are zero admitted campaigns, zero assigned slots and zero active SSM tunnels. One clean warm-cache instance remains available, with the funded five-minute idle stop due at **20:47:47.897 UTC** and funded disk retention; slots 2–4 are empty and no burst/builder compute remains running. The selected clean image is available with its funded expiry; the intermediate image/snapshot are confirmed absent. Required results, source archives and original financial/uncertain-operation receipts remain preserved. `disposition-final.json` in the private raw directory records the readback. Larger fleet qualification is the only remaining assignment acceptance gate; it requires the actual quota change, not further authorization or another implementation rewrite.
