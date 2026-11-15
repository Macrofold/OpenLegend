# Native availability and changed-record comparisons — November 15, 2026

## First ordinary changed-record comparison

The first NRF11 comparison is **inconclusive**. Two of three runs per arm qualified. Both failed runs accepted all 560 scheduled commands, but the first NPC conversation stopped before its generation request reached the provider. Both second conversations completed. The same defect occurred in the control and candidate. The four successful observations cannot establish a relative speed effect.

The campaign `b0acd16d-fc59-447d-a154-45671b8bddb4` compares `1013b10d2…` with `4293a07fa…` and retains the previous NPC repair on both sides. The only executable difference is the reuse of the candidate's staged row adapter. The worker is the managed 16 GiB `m7i.xlarge`, with a new PostgreSQL database per run. The 360-wall-second automatic window follows a ten-second warmup and uses one player, two human NPCs, three hares and 1,246 scenery records, the 2 GiB transient allowance, one Native worker and one-second ordinary saves. The order is control, candidate, candidate, control, candidate, control.

The table shows individual whole-window samples. CPU uses one logical core as its unit. Game speed is completed time relative to the intended 60× rate. Incomplete replies remain in the attempted work.

| Run  | Server CPU, % of one core | Exclusive PostgreSQL CPU, % of one core | Game speed, % of intended | First / second reply  |
| ---- | ------------------------: | --------------------------------------: | ------------------------: | --------------------- |
| 01-A |                     36.57 |                                    1.78 |                   100.008 | completed / completed |
| 02-B |                     36.21 |                                    1.75 |                   100.013 | completed / completed |
| 03-B |                     35.48 |                                    1.71 |                   100.016 | completed / completed |
| 04-A |                     37.32 |                                    1.90 |                   100.002 | stale / completed     |
| 05-B |                     37.28 |                                    1.94 |                   100.003 | stale / completed     |
| 06-A |                     36.37 |                                    1.77 |                   100.000 | completed / completed |

All six collections hash-match their managed artifacts. Worker generation 408 is stopped and available, with no remaining hold. The controller settled **$0.484548**, comprising $0.241704 compute, $0.225336 operations and $0.017508 retained storage. It released $0.336776. Continuing accounted spend at settlement was **$21.419002 of $50**. External Jev spend was $0.

The private archive `nrf11-ordinary-first-aws-20261115/manifest.json` contains 167 payloads (406,483,979 bytes), SHA-256 `10a0e3bc24662e4e725312b06a178c61cdb8711e0e7fe00be8f041f45d47f764`. Failed observations, save phases, latency, debt, database and memory measures, source and toolchain, and settlement artifacts are preserved there.

## Shared NPC repair after overlapping evidence changes

The original managed failures in 04-A and 05-B both send route and action-attention judgments and stop before sending the rendered generation request. The untimed actual Native caller on `1013b10d2…` reproduces the same refusal without a diagnostic hold. At accepted cut 1313, recognition of an unrelated actor changes the broad private-evidence revision. The first exact recheck starts while that revision is current. At cut 1319, ordinary receiving updates one temporal-support row and retires three others. The retained generation request's selected source checks still succeed at cut 1320, with unchanged authority, actor life and access revision. The previously captured broad revision fails. The generation intent settles as certainly undispatched. No generation wire request, reply or paid retry occurs. The [earlier repair](2026-11-15-npc-reply-requalification.md) kept a narrowly classified revision and allowed one exact local recheck.

`0cdf8101…` counts ordinary Native retirement of temporal support as a change eligible for exact revalidation. Exact memory invalidation still runs for every changed row. Protected mutations, other private changes, pending edits and unknown scopes keep their existing checks. Up to two exact local checks can validate the same unstarted dispatch when a second change lands during the first. The original authorized transport and final synchronous fence still gate disclosure. The common repair is shared by both arms of each subsequent isolated comparison.

The causal trace is archived at `nrf-chat-generation-fence-20261115/manifest.json`, SHA-256 `86f2d5df76e4bc9dfcb4f2f9fa9ac161123b8ebfd3150ae395ac33a6f03a06b5`. Controlled provider charges remain $0.
