# Installed warning policy — November 17, 2026

Native ordinary-play median server CPU is **40.71% → 40.93% of one logical core**, exclusive PostgreSQL CPU **2.44% → 2.22%**, and achieved game speed **99.998% → 99.998%** across three runs per revision. Source's corresponding medians are 31.58% → 30.73%, 1.63% → 1.63%, and 100.003% → 100.005%. Control and candidate complete the same scheduled ordinary work. The separate mixed-speech window and its normal-save drain retain their own figures below.

The selected world now constructs the meaning of a warning after receiving supplies a uniquely acquired place and original event time. The engine retains the evidence, speaker attribution, source proofs, permissions and order. Both runtimes consume the installed recognition policy, including its authored detector, grammar, possible strength and stated interval. The [NRF08 recipe](../../../projects/native-runtime-foundations-tech-design.md#93-nrf08--put-grounded-warning-meaning-behind-the-installed-policy) and [NRF-L09](../../../limits/native-runtime-foundations.md#nrf-l09--send-availability-and-warning-interpretation) own this boundary and the equivalence decision.

## Ordinary gameplay guard

The complete six-case campaign has three interleaved repetitions per revision, with each case running Source and Native on separate independent PostgreSQL databases. The order is control/candidate, candidate/control, control/candidate, alternating runtime order within each case. Each primary ordinary window runs for 360 seconds after ten seconds of warmup, at 60 game seconds per wall second and one-second ordinary saves. The common opening has one player, two human NPCs, three hares and 1,246 scenery records. Each runtime completes all 346 actual moves including warmup, 74 presence renewals, and two controlled HTTPS NPC replies applied and saved once in the primary window. All primary 335 movement commands per run have an observed permitted movement and normal-save acknowledgement. There are no missing scheduled conversations, commands, streams or final saves.

Table cells are median / arithmetic mean / nearest-rank p95. CPU, game speed and per-window resources each have three observations, with p95 equal to their maximum. Server CPU is a percentage of one logical core and includes Native and geometry threads once. The separate load client contributes once to complete CPU. Latency pools individual command observations and names their count.

| Metric                      | Source control                 | Source candidate               | Native control                 | Native candidate               |
| --------------------------- | ------------------------------ | ------------------------------ | ------------------------------ | ------------------------------ |
| Server CPU, %               | 31.58 / 31.25 / 32.50          | 30.73 / 30.69 / 31.83          | 40.71 / 40.58 / 41.18          | 40.93 / 41.07 / 41.67          |
| Exclusive PostgreSQL CPU, % | 1.63 / 1.70 / 1.83             | 1.63 / 1.64 / 1.69             | 2.44 / 2.35 / 2.46             | 2.22 / 2.26 / 2.36             |
| Load client CPU, %          | 0.72 / 0.72 / 0.74             | 0.72 / 0.73 / 0.78             | 0.72 / 0.71 / 0.72             | 0.73 / 0.73 / 0.73             |
| Achieved game speed, %      | 100.003 / 100.001 / 100.005    | 100.005 / 100.002 / 100.010    | 99.998 / 99.998 / 100.005      | 99.998 / 100.000 / 100.009     |
| Complete CPU, ms/game s     | 5.656 / 5.611 / 5.845          | 5.513 / 5.510 / 5.715          | 7.312 / 7.273 / 7.393          | 7.311 / 7.343 / 7.461          |
| Offered game time, s        | 21599.92 / 21599.92 / 21599.97 | 21599.82 / 21599.62 / 21599.87 | 21599.84 / 21599.92 / 21600.10 | 21599.89 / 21599.87 / 21599.89 |
| Completed game time, s      | 21600.60 / 21600.20 / 21600.96 | 21600.25 / 21600.12 / 21602.07 | 21599.37 / 21599.44 / 21600.90 | 21599.34 / 21599.84 / 21601.77 |
| Ending debt, game s         | 0.000 / 0.000 / 0.000          | 0.000 / 0.000 / 0.000          | 0.000 / 0.000 / 0.000          | 0.000 / 0.000 / 0.000          |

| Metric                     | Source control                    | Source candidate                  | Native control                     | Native candidate                   |
| -------------------------- | --------------------------------- | --------------------------------- | ---------------------------------- | ---------------------------------- |
| Command response, ms       | 6.64 / 9.23 / 27.13 (n=1005)      | 6.70 / 9.51 / 27.17 (n=1005)      | 15.88 / 19.59 / 38.84 (n=1005)     | 15.93 / 19.86 / 39.57 (n=1005)     |
| First visible movement, ms | 68.34 / 68.32 / 110.16 (n=1005)   | 65.24 / 65.87 / 109.08 (n=1005)   | 61.02 / 62.55 / 90.11 (n=1005)     | 60.27 / 62.41 / 90.94 (n=1005)     |
| Durable ACK, ms            | 604.03 / 575.47 / 996.82 (n=1005) | 598.59 / 571.78 / 995.68 (n=1005) | 573.90 / 556.35 / 1017.62 (n=1005) | 579.48 / 562.78 / 1015.05 (n=1005) |

Background-save age p50 / average / p95 is 514.19 / 506.64 / 969.94 → 514.50 / 509.33 / 972.44 ms in Source and 512.35 / 513.22 / 979.62 → 509.04 / 511.47 / 978.69 ms in Native. Sample counts are 10,675 / 10,684 and 10,730 / 10,731 respectively. The server CPU ranges overlap, at 29.66–32.50% versus 29.51–31.83% in Source and 39.85–41.18% versus 40.61–41.67% in Native.

| Metric                         | Source control              | Source candidate            | Native control              | Native candidate            |
| ------------------------------ | --------------------------- | --------------------------- | --------------------------- | --------------------------- |
| Concurrent sampled memory, MiB | 1145.81 / 1180.38 / 1290.36 | 1119.14 / 1099.36 / 1163.45 | 1528.70 / 1535.98 / 1559.81 | 1557.63 / 1539.33 / 1583.74 |
| Transient reservation, MiB     | —                           | —                           | 272.08 / 281.56 / 322.31    | 269.21 / 276.16 / 295.67    |
| SQL calls                      | 9769 / 10229 / 11417        | 9711 / 9878 / 10347         | 16367 / 15841 / 16770       | 14809 / 14891 / 15480       |
| SQL rows returned              | 13579 / 16148 / 21669       | 13422 / 14490 / 16812       | 23843 / 22516 / 25092       | 19251 / 20056 / 22143       |
| Prepared rows                  | 38258 / 37681 / 39067       | 35441 / 36340 / 38924       | 36130 / 36298 / 37200       | 37458 / 36930 / 37704       |
| Prepared bytes, MiB            | 68.88 / 67.91 / 72.05       | 61.63 / 64.02 / 71.19       | 64.75 / 64.83 / 66.83       | 68.38 / 66.59 / 68.52       |
| WAL growth, MiB                | 46.13 / 46.82 / 51.28       | 43.50 / 44.92 / 47.97       | 44.29 / 44.81 / 45.98       | 44.97 / 45.04 / 45.56       |
| Database growth, MiB           | 15.85 / 16.30 / 18.27       | 15.58 / 15.59 / 15.94       | 15.54 / 15.48 / 15.62       | 15.15 / 15.27 / 15.73       |

## Mixed ordinary speech and exact save drain

After ordinary play, each case runs a separate 96-second schedule of 24 actual Say commands. Eight earn one attributed possible warning, eight use an unknown place and eight negate the warning. All 24 retain their ordinary speech, and the controlled provider consumes the permitted testimony in the preceding cognition proof. The same utterance IDs, receipts, wordings and expected 8/8/8 result mix bind each runtime/revision's comparison. The primary mixed window's median server CPU is 34.51 → 31.89% in Source and 48.34 → 48.47% in Native. PostgreSQL is 4.27 → 4.21% and 7.34 → 7.58% respectively. Achieved speed is 99.99–100.05% across these primary observations. One Native candidate ends that primary window with 3.08 game seconds of debt.

The following window includes the actual normal background-save drain through the exact accepted cutoff. It counts intervening CPU, database work and simulation progress. The mixed driver is inline and is already included in server CPU, so its separate-client field is inapplicable. All 24 commands in every run have a unique saved utterance and a confirmed command-to-durable acknowledgement through that drain. Debt settles by the drain. Each case completes four controlled conversation-compaction exchanges across the mixed setup/readback scope. Their timing cannot be assigned exclusively to these measured windows from those whole-case request counts.

| Metric                      | Source control              | Source candidate            | Native control              | Native candidate            |
| --------------------------- | --------------------------- | --------------------------- | --------------------------- | --------------------------- |
| Server CPU, %               | 34.45 / 33.92 / 35.28       | 31.85 / 31.59 / 33.24       | 48.24 / 47.33 / 49.43       | 48.35 / 48.85 / 51.56       |
| Exclusive PostgreSQL CPU, % | 4.26 / 4.45 / 5.00          | 4.20 / 4.17 / 4.48          | 7.33 / 7.43 / 7.69          | 7.56 / 7.39 / 7.84          |
| Load client CPU, %          | —                           | —                           | —                           | —                           |
| Achieved game speed, %      | 100.013 / 100.002 / 100.020 | 100.009 / 100.002 / 100.038 | 99.999 / 100.012 / 100.044  | 100.016 / 100.011 / 100.033 |
| Complete CPU, ms/game s     | 6.452 / 6.396 / 6.711       | 6.007 / 5.959 / 6.286       | 9.258 / 9.126 / 9.449       | 9.316 / 9.372 / 9.895       |
| Offered game time, s        | 5786.44 / 5788.08 / 5795.70 | 5789.89 / 5788.30 / 5795.84 | 5787.41 / 5794.22 / 5813.51 | 5781.63 / 5782.55 / 5793.83 |
| Completed game time, s      | 5784.94 / 5788.21 / 5796.45 | 5792.08 / 5788.43 / 5796.35 | 5787.33 / 5794.89 / 5813.06 | 5782.58 / 5783.21 / 5795.73 |
| Ending debt, game s         | 0.000 / 0.000 / 0.000       | 0.000 / 0.000 / 0.000       | 0.000 / 0.000 / 0.000       | 0.000 / 0.000 / 0.000       |

| Metric                          | Source control                   | Source candidate                 | Native control                   | Native candidate                 |
| ------------------------------- | -------------------------------- | -------------------------------- | -------------------------------- | -------------------------------- |
| Say response, ms                | 36.52 / 35.99 / 43.89 (n=72)     | 32.85 / 33.76 / 46.19 (n=72)     | 60.50 / 61.72 / 77.41 (n=72)     | 63.67 / 66.10 / 78.79 (n=72)     |
| Say durable ACK, ms             | 516.98 / 555.20 / 1003.42 (n=72) | 511.78 / 576.59 / 1033.21 (n=72) | 564.41 / 561.89 / 1033.85 (n=72) | 551.02 / 573.21 / 1044.13 (n=72) |
| Complete CPU per durable Say, s | 1.5547 / 1.5425 / 1.6208         | 1.4497 / 1.4374 / 1.5183         | 2.2313 / 2.2033 / 2.2786         | 2.2447 / 2.2584 / 2.3896         |

Mixed background-save age is 514.67 / 514.74 / 973.26 → 514.64 / 509.08 / 962.52 ms in Source and 513.16 / 513.52 / 982.78 → 515.05 / 513.62 / 981.30 ms in Native, with 2,844 / 2,849 and 2,859 / 2,860 samples. Native's sampled resident peaks in the mixed primary window are 21.83 / 22.13 / 23.26 → 22.54 / 22.56 / 23.44 MiB, and pending-save peaks are 0.754 / 0.735 / 0.766 → 0.849 / 0.874 / 1.031 MiB. They retain independent owners from the separately shown transient budget.

| Metric                         | Source control              | Source candidate            | Native control              | Native candidate            |
| ------------------------------ | --------------------------- | --------------------------- | --------------------------- | --------------------------- |
| Concurrent sampled memory, MiB | 1182.30 / 1221.01 / 1395.28 | 1113.53 / 1079.77 / 1128.04 | 1712.98 / 1715.04 / 1725.11 | 1715.71 / 1716.52 / 1735.28 |
| Transient reservation, MiB     | —                           | —                           | 325.14 / 318.99 / 355.39    | 345.65 / 336.56 / 362.37    |
| SQL calls                      | 8206 / 8212 / 8303          | 8014 / 8044 / 8135          | 12134 / 12375 / 12916       | 12090 / 12169 / 12507       |
| SQL rows returned              | 26635 / 26130 / 27012       | 24766 / 25507 / 27529       | 37175 / 36155 / 37304       | 37465 / 37807 / 40430       |
| Prepared rows                  | 9654 / 9135 / 10221         | 7468 / 7313 / 7512          | 7218 / 7571 / 8700          | 7542 / 7930 / 8746          |
| Prepared bytes, MiB            | 19.73 / 18.48 / 20.16       | 14.89 / 14.73 / 15.33       | 13.71 / 14.54 / 16.91       | 14.04 / 15.19 / 17.53       |
| WAL growth, MiB                | 22.70 / 22.42 / 23.30       | 20.32 / 19.90 / 20.77       | 18.48 / 18.82 / 19.65       | 18.10 / 18.60 / 19.99       |
| Database growth, MiB           | 10.15 / 10.21 / 10.67       | 8.94 / 9.03 / 9.30          | 8.60 / 8.24 / 8.65          | 8.24 / 8.45 / 9.20          |

The memory columns sample application/descendant RSS plus exclusive PostgreSQL memory concurrently. Shared pages can appear more than once. Peaks within the mixed window do not establish a retained or settled RAM floor. Normal GC and the 2 GiB transient profile remain in use. The source revision does not expose Native reservation figures.

## Disposition and evidence

**Retain the installed policy composition for the world/engine ownership boundary. Complete CPU benefit is inconclusive.** Mixed-plus-drain CPU per durable utterance changes by -10.56%, -13.54% and +4.56% in the three Source pairs, and +7.10%, +1.95% and -1.49% in the Native pairs. The three-run Source median is 6.75% lower, while the Native median is 0.60% higher. Repeat ranges overlap and autonomous bookkeeping writes vary. The ordinary guard also overlaps. The experiment establishes no material reproducible regression under NRF-L09 and no consistent speed claim. The authored policy constructor replaces the previous engine-owned meaning without adding a registry, second parser or new world law. Overall Native adoption, memory settling and rendered play retain their independent evidence owners.

The actual-caller records cover exact hearing/supports, warm/cold persistence, a contrasting authored prefix with unchanged engine code, ambiguous and uninformed listeners, movement during the held reply, genuine source withdrawal, and a late admission refusal with exact-ID retry. The finite endpoint supplement passes through both real event receivers, records and PostgreSQL cold reopen. Acquisition at the original source time is admitted. At source time + 120 − 0.000001 game seconds it still earns the exact two-support claim. At source time + 120 it retains the heard utterance with zero interpreted warning originals. Ordinary Say emits and receives synchronously in one accepted candidate, so its natural producer exercises the inclusive start. The end cases explicitly inject the earlier original time in copied emission owners while retaining the installed policy and real receiver checks. Native uses a separately identified diagnostic debug addon, with source digest `846dc884a273bfdb7d3d6148571df7e40e5e5efe2216900bcc53706b66c35ce2`, addon `0d036fe2ee4825e23a1eeb0ebf0ed12c332d0bea41b4b9147559639e82e7c6ef` and the same generated declaration. These endpoint diagnostics supply correctness evidence only.

A declared replacement-life initializer then uses Source's retirement and actual hearing owners before saving for each runtime's supported installer. Fresh warnings and hearing belong to observer life 1, while the older remembered place retains its life 0 support without rewritten time or provenance. Both actual warm/cold readers preserve the distinction. Native's current NPC inspection also reports life 1. The first malformed initializer saved an old current root before completing replacement and Native refused it. A subsequent fixture exceeded its initial presence lease. The final application checks pass with ordinary renewals and clean database/shutdown reports. No Native revival mechanic was added. The supplement's 68-payload manifest is `b2481c34b2735728e3fd3c20babba127165fb933287672fe925fe38ac994f104`, with diagnostic source base `841fb312204d5b85b4336fc4b9e7d3d488b9f79f` and the unchanged production release for the life checks.

Campaign `e22f44eb-d229-4914-a4ad-98fa306df600` ran on physical standard H0 worker `i-0b0123f0b2254c76b`. Control `e421776e223d995ebfa0e10213700036c660d66c` and direct-child candidate `bfe1fbfc5533c388cc22aec4520985dca010ffe0` retain the same common NPC repairs. Native source changes from `f9173b41a7a2301943d67b9b3fa179f7a8e86844842d68830022960dbd268970` to `8bd8522420da576e9eecf65459e67aea753b088839abd546e1ba51aed19c05c4`. The declaration stays `97726111eaf38ca1686847cdd2469cee554855b04e3bf0ba2fa1f7b962060ba5`. Workload SHA-256 is `1643451fd61d58605403201d1c10c395aaf05cc88391bfd29740ee7633336393` and the original plan SHA-256 is `b4c4229cd8e4e348e7582047dba3d972a39271d7a26280141a4186c9755c5f5d`. Each Linux addon has its exact rebuilt hash and source witness in the collected artifacts.

All 138 raw manifest entries verify by length and SHA-256 (138,207,094 bytes). All twelve application/process results finish cleanly and have unique installed database generations, matching request schedules and exclusive PostgreSQL receipts. Raw remains under the managed campaign's collected results, with no deleted or substituted attempt. Estimated campaign use is $1.430698. Additional and cumulative external Jev/provider cost is $0. Local preparatory timing remains outside this evidence.
