# Native receipt-tail ownership comparison — November 15, 2026

Median server CPU was **83.34% / 93.29% of one core** (control / repaired), and exclusive PostgreSQL was **2.94% / 3.47%**. The world was paused, so game speed is inapplicable. All six original captures complete equivalent work on independent databases. Combined CPU per capture is **11.52 / 11.08 ms** at the median. Both wall and CPU ranges overlap and the candidate wall-time p95 is slightly higher. **The isolated cost effect is inconclusive.** Keep the verified ownership correction.

Campaign `25265953-68b8-4f01-95db-c21b01b81c36` compares `e326a0aad576e751738d64a9acf38fb992ec907e` and `6665d66d77b6076d06493b1ba990e45ca0034c49`. Only the three TypeScript receipt-tail files differ in executable source. Both use Native source `e3039aa2…`, generated declarations `faf0f550…`, loader `f51e0961…`, pinned Node 22.23.2 and the same clean normal profile. Plan SHA-256 `715b008f3120c6b745607672557e863a3879f7fcf6030939b2d58f2abe532877`, caller archive `60948ab4…`, toolchain `a0fe6d02…`. Three interleaved attempts per arm run on the same managed standard 16 GiB AWS `m7i.xlarge`, worker generations 355–360, one native worker and 2 GiB transient reservation allowance. Additional and cumulative Jev cost is **$0**. The controller settled the separate worker charge at **$0.340738** and released the remainder of its $0.805246 hold. The final generation is stopped and available, with no campaign reservation or active claim. The accounted task spend at that settlement is **$18.082487** of the authorized $50.

The actual Source-authored opening has one player, two human NPCs, three hares and 1,246 scenery records. Setup saves personally received observations and installs a truthful partial Native view: five physical pages stay in PostgreSQL, with their genuine directory and latest tail at batch 452, entry 0. Each scope measures one actual paused NPC capture through the SQL lookup, Rust resolution, same-cut recapture and final ownership release. Both arms return the same original actor and accepted cut 1, with zero action offers, no inference and unchanged progress and scoped canonical SQL. The old private HTTP failure has no equivalent-work denominator; its corrected actual caller is separate.

Statistics are median / arithmetic average / nearest-rank p95, with three observations per arm. Server CPU includes native and worker threads once. Exclusive PostgreSQL is separate; no client runs in the measured scope. Compare absolute CPU per capture as well as utilization, which depends on the duration of the window.

| Metric                                          | Control, n = 3          | Repaired, n = 3         | Control range   | Repaired range  |
| ----------------------------------------------- | ----------------------- | ----------------------- | --------------- | --------------- |
| Server CPU (%)                                  | 83.34/84.89/93.96       | 93.29/90.24/98.20       | 77.36–93.96     | 79.23–98.20     |
| Exclusive PostgreSQL CPU (%)                    | 2.94/3.18/3.98          | 3.47/3.52/3.90          | 2.63–3.98       | 3.20–3.90       |
| Combined CPU (%)                                | 85.97/88.07/97.94       | 97.19/93.77/101.67      | 80.30–97.94     | 82.43–101.67    |
| Capture wall time (ms)                          | 14.11/13.10/14.35       | 10.90/12.05/14.54       | 10.83–14.35     | 10.73–14.54     |
| Combined CPU per capture (ms)                   | 11.52/11.42/12.13       | 11.08/11.16/11.98       | 10.60–12.13     | 10.43–11.98     |
| Larger of two RSS + PostgreSQL samples (MiB)    | 665.40/651.51/683.31    | 625.40/638.99/678.67    | 605.84–683.31   | 612.90–678.67   |
| Smaller of two transient headroom samples (MiB) | 2027.45/2027.47/2027.51 | 2027.50/2027.49/2027.52 | 2027.45–2027.51 | 2027.45–2027.52 |

| Run                  | Outcome         | Wall ms | Server CPU (%) | PostgreSQL CPU (%) | Combined CPU ms |
| -------------------- | --------------- | ------: | -------------: | -----------------: | --------------: |
| nrf10-tail-01-before | Complete, clean |   14.11 |          83.34 |               2.63 |           12.13 |
| nrf10-tail-02-after  | Complete, clean |   10.90 |          98.20 |               3.47 |           11.08 |
| nrf10-tail-03-after  | Complete, clean |   14.54 |          79.23 |               3.20 |           11.98 |
| nrf10-tail-04-before | Complete, clean |   14.35 |          77.36 |               2.94 |           11.52 |
| nrf10-tail-05-before | Complete, clean |   10.83 |          93.96 |               3.98 |           10.60 |
| nrf10-tail-06-after  | Complete, clean |   10.73 |          93.29 |               3.90 |           10.43 |

All six runs report four profiled SQL calls and two returned rows, with no SQL failures or prepared writes. The profile does not classify affected rows for all four query families. Storage snapshots include the untimed surrounding witness reads and show zero WAL or database growth in both arms. Memory sums are two co-observed boundary samples; they are not an interval peak or normal-GC settling. The complete waited-process work includes installation and shutdown, and is recorded separately outside Git.

This window does not measure offered or completed automatic time, ordinary saves, command/movement streams, a model reply or steady-play CPU. These have their own comparison. Exact input encoding and independent lifetime checks run separately on their real callers to keep observers out of timings. The earlier retained private refusal, quota refusal/retry and independent read over acknowledgement remain [correctness evidence](../../../maintainers/native-runtime-foundations.md#current-profile-caller-and-fixture-evidence--november-15-2026).

Private evidence: `nrf10-tail-caller-comparison-20261115/manifest.json`, SHA-256 `ff6b090ac6521c9b1973bd6a638305f90dad2db6bf45c18ac0b515989cbe2589`. It binds all six original collected runs, the comparison reducer, the plan, immutable workload, and collection and settlement receipts.
