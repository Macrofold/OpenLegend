# Rust NPC and background-work experiments — November 20–21, 2026

The experiments follow the [prior profile findings](2026-11-20-rust-hot-path-comparisons.md#next-profiling-candidates-outside-movement-perception-and-saving). The common control is `36ea646920916a57acbdafce97a11e8b91331d84`. Ordinary comparisons use independent PostgreSQL databases on the standard 16 GiB worker, with one player, ten human residents, ten deer, and five hares. Each run measures 180 real seconds after warmup and requires 34 saved walks, steering, two saved controlled conversations, and a separate cold continuation. Observations made after that window do not count toward steady CPU or latency.

## Gameplay checks

- **Integrated release.** Campaign `a0f0daef-32a7-481f-97cb-fbae9da2786b` passed type and network checks, release build, all 34 saved walks, both saved conversations, 204 actual optional memory reviews, and cold continuation. It used source `047e84a4aa6f` and release `e356d2f61755`. This is one integrated run and does not isolate any change.
- **Status deadlines.** Campaign `67147f31-6e15-4d3e-8cfb-d030ce89eb4f` matched the authored food and fractional sleep thresholds. Both fixtures initially checked the wrong spelling of the saved sleep event. The repaired fixtures in `c9bc9f97-c69a-4528-aa99-d4b9e19652a0` matched all ten saved cuts, including the sleep episode, cold reopening, and exactly two starvation effects at game seconds 50670 and 50970. Health fell from 100 to 97 to 94. Both hosts saved and released through revision 16 and game second 50976. The original fixture exits still reported failure because they treated the work counter for one interval as cumulative. A separate reduction reverified all 28 sealed files and checked the actual effects and resets. A later unneeded cut did not execute. The status candidate is `2eab0b629e8e`.
- **Job-status display.** Campaign `8b70de18-bae6-4aee-afe9-c86b8190f4ae` checked 525 jobs with mixed ownership through the authenticated state route. Both builds displayed the same four permitted jobs, in order, on both sides of restart. They preserved the failed-status message with an embedded NUL and isolated UTF-16 unit, and excluded the wrong account, wrong actor, foreign speech, and permitted rows older than the existing display window. The checked source was `5948ceb218e2`. The performance candidate `99d097da43e2` adds a requirement for explicit unowned metadata before falling back to speech or NPC scope.
- **NPC recall.** Campaign `02b48c4e-28d8-4166-abe5-6601b9874dbe` passed Send, selected-memory withdrawal, and cancellation in both arms. The regular reply used the required and selected memories, omitted refused or missing memories, and saved the same single speech and reply with one provider generation. Both builds recovered the same receipt after reopening. The held cases moved during review and checked refusal or cancellation without stale effects. The candidate uses the existing active and suspended plan display cursors. The fixture did not specifically seed both plans.
- **Scheduling.** Campaign `9f8a7623-f6d4-434a-9c8c-324e531bc147` passed all three integrated caller checks on `76773c1a2bca`. A pending optional cue dispatched at its allowed time and remained spent after reopening. Withdrawing the cue prevented optional dispatch. An addressed conversation completed once with no duplicate thought for the same speech. That case observed four bounded original-speech ownership queries and four predecessor checks, with zero full-job ownership queries and zero ownership transfer preflights.
- **Search indexing.** Campaign `bd89d1e2-3ff9-4ed6-884e-ce9ba6827ed8` used actual speech heard by two nonrecipient residents. Both builds had byte-identical search text and vectors for those residents in the same native publication transaction, with each indexed row tied to its own source revision. Forgetting one resident's evidence removed that resident's index entry and preserved the other's vector and the original speech. These outcomes survived cold reopening. This proves the reuse case occurred, with `ef5a3191f3a5` as the candidate. It does not establish ordinary repetition frequency or speed.

## Ordinary-play findings

**Narrow speech ownership lookup removed.** All six runs of `dc40cf1e-ff6e-4c9a-86aa-e81c871a1dbf` completed on control `4173d7a41315` and candidate `a9bce622ddf7`. The candidate had later p95 movement receipts and substantial variation in automatic judgments. The focused query did less work, but the ordinary results do not justify retaining it.

**Compact job-status display retained.** In `89f67b13-dbbf-4604-b73b-47be2a55f2ef`, PostgreSQL's database-wide scan counter (`tup_returned`) dropped in all three pairs. The median fell from 1.94 million to 0.98 million. Pooled p95 movement receipt fell, while median sampled memory and WAL grew. Automatic judgments varied substantially. The smaller indexed read earned retention for the consistently lower scan work, with inconclusive complete CPU. The final storage shape supplies the display's resident ID only for thoughts, after removing the speech-lookup variant. [PostgreSQL scan counter definition](https://www.postgresql.org/docs/16/monitoring-stats.html#MONITORING-PG-STAT-DATABASE-VIEW)

**Batch lexical reuse removed.** The same campaign proved the implementation worked, but ordinary CPU varied and median sampled memory grew. The lookup and extra ownership did not earn retention. The existing search correctness and coverage rules remain the authority.

The 27 frozen steady windows recorded 3,273 automatic jobs prompted by current physical relations, 1,066 prompted by events, and zero optional-discovery jobs. The counts come from durable jobs. Individual jobs can use more than one model judgment. Slowing optional curiosity further would miss the work exercised in this opening.

**Recall preparation retained.** Its frozen candidate used 3.8–7.2% less combined CPU per completed game-second in all three pairs. Automatic resident judgments varied, including one pair in which the candidate completed more. The final implementation retains the narrow recall path, with the exact-text repair qualified separately below.

**Scheduler intake retained with an exact-text reader.** The frozen one-intake candidate used 2.9–6.8% less combined CPU per completed game-second across the three pairs. It also ran fewer automatic judgments in every pair, so the comparison cannot assign the full saving to decoding. The final typed reader supersedes the frozen candidate's Unicode-only JSON reader. The old timings belong to the frozen revision.

**Body deadline sharing retained as a simplification.** Combined CPU changed by −2.4%, −5.1% and +2.1%. The comparison supplies no repeatable CPU gain. The focused timing check and exact saved cuts justify sharing the same attribute read and threshold across comparison and forecasting.

All 12 physical runs in `8080089e-123b-4eec-853d-8aa47d11b53c` completed the required ordinary workload and cold continuation. All 161 files matched the manifest. The runner recorded clean cleanup and retired slot 5, and AWS reported neither the instance nor its volume. The controller settled its estimated cost at $0.732312 with no campaign reservation left.

## Matched 180-second windows

Each entry gives median / mean / p95, control → candidate. The CPU figures use three steady windows per arm, with all server threads counted once and PostgreSQL measured separately. First movement ends at stream receipt. The latency figures pool 96 steady walks per arm. Savings acknowledgements use the database observer.

| Experiment              | Server CPU, % of one core             | PostgreSQL CPU, % of one core   | Game speed, % of intended                         | Paired combined CPU change, % |
| ----------------------- | ------------------------------------- | ------------------------------- | ------------------------------------------------- | ----------------------------- |
| Recall preparation      | 49.91/49.95/51.23 → 46.96/47.06/47.34 | 7.20/7.20/7.40 → 7.01/6.99/7.06 | 100.000/100.009/100.028 → 100.000/100.000/100.000 | -5.18 / -7.15 / -3.83         |
| Scheduler intake        | 49.91/49.95/51.23 → 47.76/47.78/49.14 | 7.20/7.20/7.40 → 6.70/6.70/6.79 | 100.000/100.009/100.028 → 100.000/100.009/100.028 | -6.75 / -4.27 / -2.94         |
| Body deadlines          | 49.91/49.95/51.23 → 48.68/49.12/50.06 | 7.20/7.20/7.40 → 6.87/6.97/7.22 | 100.000/100.009/100.028 → 100.000/100.009/100.028 | -2.41 / -5.10 / +2.06         |
| Compact job status      | 43.02/44.91/50.12 → 45.29/45.87/47.28 | 5.90/6.30/7.16 → 6.02/6.08/6.26 | 100.000/100.000/100.028 → 100.000/99.991/100.000  | +8.05 / -10.99 / +9.63        |
| Lexical reuse           | 43.02/44.91/50.12 → 44.72/44.46/45.91 | 5.90/6.30/7.16 → 6.27/6.31/6.50 | 100.000/100.000/100.028 → 100.000/99.992/100.000  | +7.18 / -8.54 / +0.35         |
| Speech ownership lookup | 50.13/50.13/52.23 → 49.06/51.34/55.97 | 6.66/6.66/6.90 → 6.52/6.55/7.08 | 100.000/100.000/100.001 → 100.000/100.010/100.028 | -6.80 / +1.49 / +11.52        |

| Experiment              | Command response, ms        | First movement receipt, ms        | Durable acknowledgement, ms             | Combined CPU, median ms/game-second | Concurrent memory peak, median MiB |
| ----------------------- | --------------------------- | --------------------------------- | --------------------------------------- | ----------------------------------- | ---------------------------------- |
| Recall preparation      | 6.5/6.9/10.5 → 6.3/6.8/11.1 | 50.7/53.7/78.9 → 51.5/52.6/79.7   | 605.2/600.0/1088.3 → 566.4/589.6/1081.6 | 9.483 → 8.994                       | 534.9 → 535.3                      |
| Scheduler intake        | 6.5/6.9/10.5 → 6.6/7.1/12.4 | 50.7/53.7/78.9 → 48.5/50.2/73.2   | 605.2/600.0/1088.3 → 581.9/588.6/1085.8 | 9.483 → 9.078                       | 534.9 → 530.6                      |
| Body deadlines          | 6.5/6.9/10.5 → 6.9/7.3/13.1 | 50.7/53.7/78.9 → 47.4/50.7/78.8   | 605.2/600.0/1088.3 → 542.1/567.4/1082.1 | 9.483 → 9.255                       | 534.9 → 534.1                      |
| Compact job status      | 8.6/8.7/14.0 → 7.0/7.8/13.3 | 68.9/64.4/105.3 → 66.6/59.9/95.8  | 567.2/581.9/1057.7 → 573.1/592.1/1062.7 | 8.142 → 8.552                       | 519.4 → 537.6                      |
| Lexical reuse           | 8.6/8.7/14.0 → 7.0/7.4/12.1 | 68.9/64.4/105.3 → 60.1/58.3/100.8 | 567.2/581.9/1057.7 → 544.2/567.1/1059.6 | 8.142 → 8.483                       | 519.4 → 530.4                      |
| Speech ownership lookup | 7.3/8.0/14.0 → 7.1/7.3/10.4 | 49.7/50.8/77.4 → 56.6/56.5/93.8   | 548.3/581.4/1088.5 → 606.5/595.4/1102.1 | 9.423 → 9.251                       | 569.8 → 571.6                      |

Database and allocation figures below are steady-run medians except for the transient reservation peak, which covers the whole server lifecycle. SQL trips and transferred bytes come from the focused wire trace. The ordinary table uses the database-wide scan and commit counters.

| Experiment              | Database commits | PostgreSQL scan counter | WAL, MB       | Database growth, MB | Transient reservation peak, MiB | Client CPU, % of one core |
| ----------------------- | ---------------- | ----------------------- | ------------- | ------------------- | ------------------------------- | ------------------------- |
| Recall preparation      | 9411 → 9181      | 3112235 → 2037140       | 105.7 → 107.4 | 35.5 → 35.0         | 199.5 → 203.7                   | 0.89 → 0.89               |
| Scheduler intake        | 9411 → 8741      | 3112235 → 2083361       | 105.7 → 100.8 | 35.5 → 32.2         | 199.5 → 185.3                   | 0.89 → 0.88               |
| Body deadlines          | 9411 → 9091      | 3112235 → 2026873       | 105.7 → 102.3 | 35.5 → 31.2         | 199.5 → 181.6                   | 0.89 → 0.88               |
| Compact job status      | 8703 → 9360      | 1936817 → 981267        | 95.4 → 109.6  | 29.7 → 33.9         | 188.5 → 187.3                   | 0.84 → 0.86               |
| Lexical reuse           | 8703 → 9052      | 1936817 → 2696296       | 95.4 → 104.2  | 29.7 → 33.5         | 188.5 → 187.6                   | 0.84 → 0.84               |
| Speech ownership lookup | 9241 → 8697      | 1263344 → 1144020       | 97.9 → 100.6  | 32.3 → 33.1         | 185.2 → 185.9                   | 0.93 → 0.92               |

| Experiment              | Control source | Candidate source | Frozen campaign                        | Completed runs |
| ----------------------- | -------------- | ---------------- | -------------------------------------- | -------------- |
| Recall preparation      | `36ea64692091` | `9da6700c34fc`   | `8080089e-123b-4eec-853d-8aa47d11b53c` | 6/6            |
| Scheduler intake        | `36ea64692091` | `3488206b08d7`   | `8080089e-123b-4eec-853d-8aa47d11b53c` | 6/6            |
| Body deadlines          | `36ea64692091` | `2eab0b629e8e`   | `8080089e-123b-4eec-853d-8aa47d11b53c` | 6/6            |
| Compact job status      | `36ea64692091` | `99d097da43e2`   | `89f67b13-dbbf-4604-b73b-47be2a55f2ef` | 6/6            |
| Lexical reuse           | `36ea64692091` | `ef5a3191f3a5`   | `89f67b13-dbbf-4604-b73b-47be2a55f2ef` | 6/6            |
| Speech ownership lookup | `4173d7a41315` | `a9bce622ddf7`   | `dc40cf1e-ff6e-4c9a-86aa-e81c871a1dbf` | 6/6            |

## November 21 review checks

The schema-64 checks passed on local PostgreSQL with pinned Rust 1.99.1 debug build `2f7644ffa3d8` and a controlled loopback provider. These are correctness and SQL plan checks. The frozen AWS timings cover their original sources.

- **Scheduler recovery.** The real scheduling transaction waited on a held cursor row, detected its changed predecessor, and rolled back. A later world update dispatched and saved one optional decision. Reopening preserved its spent interval. A separate reservation probe verified that a temporary decode allocation refusal retains its capacity classification.
- **Status and retry.** The authenticated state route displayed the same four permitted statuses out of 525 jobs before and after reopening. It withheld the foreign-owned job with missing scope metadata even though it referenced the viewer's own speech. An explicit retry read the failed job's stored text exactly, refused a superseded same-scope attempt, ignored four newer jobs with different scope, and saved one reply for two requests with the same ID. Reopening returned the same receipt. A 4,000-row PostgreSQL plan used the existing speech index for retry eligibility.
- **Held recall.** While a memory review was held, the player moved and either withdrew the selected evidence or cancelled the request. Both cases saved movement and returned the expected refusal without applying a reply. Reopening recovered the terminal receipt. NPC reference binding still checks externally supplied ordinals against the permitted selection.
- **Speech and restore.** Both server paths saved the exact spoken text containing NUL and an isolated UTF-16 unit, with three permitted searchable rows each. The stand-alone server reopened the saved speech. The recovery command removed 68 old speech links and preserved the other job values, two already-unlinked jobs, and access grants. Failure on the second page rolled back all 64 earlier staged edits, and retry and cold reopening recovered one exact receipt.
- **Baseline failure.** The same speech had still stopped the stand-alone scheduler and prevented a reply. The original save retained the wording. The next check covers the scheduler and reply repair through that same input.

## Exact text gameplay

The disposable HTTP scenario compared local Rust builds `2f7644ffa3d8` and `c06736491ac5` against separate PostgreSQL databases and a controlled HTTPS provider. It sent speech containing a NUL, an isolated UTF-16 unit, and a literal escape. The earlier build saved the exact speech, then stopped scheduling and failed the reply before provider dispatch.

The repaired build preserved the original speech and three searchable personal rows. The actual provider prompt preserved the NUL and distinguished the isolated unit from the literal escape. One reply committed, a replay returned the same receipt, and a second resident completed a background decision while retaining their original evidence. An authorized walk, the receipt and the original wording survived cold reopening. A new ordinary conversation then completed. Separate held withdrawal and cancellation cases saved movement and recovered their terminal receipts without applying a reply. All owned local processes and databases cleaned up.

The scheduler's selective reader also matched the prior scheduling digests, proposals, deadlines and source order in six ordinary diagnostic cases. An additional case preserved the exact cue containing an isolated unit, a NUL and an astral character through job preparation. These checks establish correctness. The retained joint build's ordinary-play check is separate from the frozen timing comparison.

A repeated live scheduling check forced the predecessor to change while the real SQL write was waiting. The refused write consumed no attempt. A later update committed one optional decision, and reopening retained its spent interval.

## Saved sequences and private reply context

The local control `c06736491ac5` reopened a valid saved observation with sequence `217.0`, then stopped background scheduling before looking up who heard the speech. A separate control saved the exact player speech and the NPC's private records, then failed the reply before contacting the provider.

- The reviewed build `87965e985ff7` preserved the spellings `208.0` and `208e0` in separate reopened PostgreSQL worlds. Both runs reached the speech lookup, saved a background decision and applied one new conversational reply. A waiting scheduler write also rolled back on a changed predecessor, then saved one attempt on a later update.
- The actual HTTPS prompts preserved the permitted mind document and distinguished an isolated UTF-16 unit from a literal escape before and after restart. The private thought was absent from all eight provider requests. The reply applied once, command replay returned the existing receipt, and movement and exact stored text survived reopening. In the held withdrawal and cancellation cases, movement saved and the conversation applied no reply. Each local scenario cleaned up its database and processes.
- The decision packet omits history and validation fields consumed only by native binding or the full bridge reader. The formatter also skips unused nested fields and releases decoded inputs after its outputs own their storage. These checks establish correctness and identify work the server no longer does. The frozen AWS runs retain their own source and performance results.

## Final ordinary play

Campaign `81dfa3e0-f151-4ef4-99d8-d0e655721b09` verified integrated source `b7929269db8b`, release executable `7b07fa2b152a`, and all 24 sealed files on the standard 16 GiB worker. Type and network checks passed. The player completed 34 saved walks, steering and two controlled saved conversations. Reopening recovered the receipt and produced a usable view in 941 ms. The separate authenticated status check displayed the same four permitted jobs out of 525 before and after reopening and kept the job with missing owner metadata private.

In the single 180-second steady window, server and PostgreSQL CPU used 43.47% and 6.18% of one core. The client used 0.87%. The game completed all 10,800 offered game-seconds at 100.00001% of intended speed. The direct clock does not expose its internal debt. First movement reached the stream in 58.6 ms median and 85.4 ms p95. Durable acknowledgement took 537.4 ms median and 1,085.6 ms p95. Concurrent memory peaked at 528.9 MiB. Shutdown released all native memory reservations. PostgreSQL's database-wide scan counter advanced by 1,053,220, and WAL grew by 106.0 MB. Combined CPU was 8.275 ms per completed game-second. The frozen comparisons above carry the repeated timing evidence.

The runner verified cleanup, released the claim and confirmed slot 2 stopped. AWS independently reported the instance stopped. The final campaign settled at an estimated $0.319763 with no campaign reservation and $0 in provider charges.

## Pending intentions and packet admission

The local control `87965e985ff7` rejected a current-format world with two valid pending intentions produced by the Source domain. The repaired build `6bad2d6c3eb4` reopened those same records through PostgreSQL. A directed conversation before and after restart included the permitted description, normalized text, method and refusal reason in its controlled HTTPS recall request. The generation included the original description, and each conversation applied one reply. The other resident's intention and private thoughts stayed outside the directed context and public view. Command replay, movement, a resident's background decision and checkpoint recovery preserved their receipts or exact records. A separate startup with a mismatched normalized value refused the record and left the database unchanged. Both held withdrawal and cancellation scenarios passed again on the repaired build.

Two local scenarios used a separate executable `d1c03aa48a34` to exhaust only the foreground packet's byte allowance. The first refused the encoder's reservation and the second refused the final packet join after its components were prepared. Both saved a preparation-capacity outcome before any provider dispatch or reply effect. The player could explicitly retry their original speech and receive exactly one saved reply. Cold reopening recovered both outcomes and accepted a fresh conversation. All native reservations returned to zero at shutdown.

The successful retries encoded the full and narrow products from the same two live reads. Their internal sizes were 134,130 → 63,399 bytes and 134,154 → 63,412 bytes, about 53% less in each case. This diagnostic measured packet bytes separately from the clean CPU comparison.

## Full versus smaller reply packet

Campaign `d9d493c7-8fad-4806-9f53-1a5880da33a4` ran six clean release cases on the same managed 16 GiB `m7i.xlarge` in slot 2. The two sources include both correctness fixes and differ only in the stand-alone reply packet selected. The full-packet source was `5f93dcd7c816` and the smaller-packet source was `eb32be23a7cd`. The sealed plan `b2ac3d6c7ba4` ordered full, smaller, smaller, full, full, smaller. The unchanged tools, driver and language archives were `33263c97650e`, `a37df8d96f2a` and `ab6dec394581`. All 83 collected files passed checksum verification.

Each independent database ran the same opening with one player, ten human NPCs, ten deer, five hares and 1,246 scenery objects. Each run completed the 180-second steady window with one simulation worker, the 2 GiB allowance, a player stream, one-second saves, 34 saved movement commands, steering and two saved controlled conversations. A separate cold restart recovered the receipt. The harness collected 32 command, movement and durability timings per steady window. Values below are median / average / p95. For a run-level metric, p95 is the largest of three runs.

| Measure                                                          |                 Full packet |              Smaller packet |
| ---------------------------------------------------------------- | --------------------------: | --------------------------: |
| Server CPU, % of one core                                        |       50.27 / 49.89 / 51.36 |       48.41 / 48.32 / 49.33 |
| Exclusive PostgreSQL CPU, % of one core                          |          6.81 / 6.75 / 7.07 |          6.56 / 6.70 / 7.00 |
| Client CPU, % of one core                                        |          0.94 / 0.95 / 0.97 |          0.95 / 0.95 / 0.97 |
| Achieved game speed, % of intended                               | 100.000 / 100.000 / 100.000 | 100.000 / 100.009 / 100.028 |
| Command response, ms                                             |            8.2 / 9.2 / 16.4 |            7.9 / 8.7 / 17.8 |
| First movement in the player stream, ms                          |         45.5 / 54.2 / 101.2 |          47.5 / 52.6 / 92.9 |
| Command to durable acknowledgement, ms                           |      579.4 / 599.7 / 1107.1 |      573.7 / 590.1 / 1082.2 |
| Concurrent server and PostgreSQL memory peak, MiB                |       532.0 / 532.0 / 539.7 |       537.0 / 537.2 / 540.9 |
| Transient native reservation peak, MiB                           |       185.2 / 185.7 / 189.0 |       150.9 / 151.8 / 155.8 |
| Combined server and PostgreSQL CPU, ms per completed game-second |          9.51 / 9.44 / 9.74 |          9.16 / 9.17 / 9.39 |

The harness used a separate 1.48 → 1.46% of one core on average. Every run offered 10,800 game-seconds. Observed completions were 10,799.95–10,800.00 for the full packet and 10,800.01–10,803.01 for the smaller packet. The small difference follows the observed window boundaries. The running clock did not expose its internal elapsed-time debt. Cold startup to first usable view took 1,058 / 1,068 / 1,093 ms for the full packet and 1,042 / 1,045 / 1,058 ms for the smaller packet.

During steady play, median database commits were 9,062 → 8,659 and the PostgreSQL `tup_returned` scan counter increased by 1.04 → 1.54 million. Median WAL growth was 103.88 → 102.54 MB and database growth was 34.11 → 35.81 MB. This driver measures database counters and exclusive database CPU. Individual statement counts and prepared-row bytes are unavailable. Median resident and pending-save reservation peaks changed from 172.83 → 172.99 MiB and 7.28 → 7.22 MiB.

**Disposition.** Retain the smaller packet. It removes serialization of unused fields, and peak transient reservations were lower in all three pairs. The median reservation fell 18.5%. Sampled concurrent memory was slightly higher. Complete CPU savings are inconclusive. Combined CPU per game-second changed by −8.0%, −3.7% and +3.5% across the three pairs. The paired steady-play jobs triggered by physical relations changed by 152 → 79, 116 → 85 and 83 → 162, in the same direction as combined CPU. Foreground work completed in every run, and the variable background work prevents attributing the whole CPU difference to the packet.

The release executable SHA-256 prefixes in pair order were `8ac4a7290229`, `bad07241c3da` and `f302270e9b5c` for the full packet and `f7583dcfc2a5`, `0d698407e17c` and `f2b0334e921a` for the smaller packet.

The runner verified cleanup, released slot 2 and recorded it stopped. An independent EC2 read confirmed the stop. The campaign settled at an estimated $0.585582 with no remaining campaign hold and $0 in provider charges. The continuing task ledger contained $94.574402 in estimated spend and $1.325803 in older holds against the shared $100 ceiling.

## First typed conversation handoffs

On November 21, pinned local debug source `a782ad14f45b8393c8d4eafdb154d335cd3eabc6` (executable SHA-256 `209d0db692f794295466939d852131048c800d89c9ef636c02728a19a444d52f`) used separate disposable PostgreSQL databases, the existing opening and controlled HTTPS. Rust served the real authenticated endpoints, player stream, clock, ordinary saver and reply application without a Node server process. The fixture driver and HTTPS model stand-in ran separately from the server.

- A real walk appeared in the player stream while the reply's optional relevance request was held. Releasing it led to one final generation, one applied reply and a saved receipt recovered on a fresh process.
- Withdrawing a required utterance while the same review was held changed its history privacy revision. The review attempt settled, the final generation never started and no reply applied. Cancelling during settlement likewise produced no final generation or reply. Both fixtures recovered accepted movement and closed cleanly.
- A separate held generation returned exact UTF-16 text. Speech applied once and the dependent movement was refused for its invalid world destination. A repeated request recovered the same saved receipt. The older binary refused that exact response before applying it. An initial ordinary companion run failed the cold process's final save with `WriterUnavailable`. A repeat completed. The first failure remains evidence of an intermittent shutdown gap.

These checks qualify the selected path locally. The overlapping-update check at the final source comparison, automatic prompt parity and isolated managed-worker comparisons remain open. No CPU, latency or memory improvement is attributed to these handoffs yet.

The release built from `b8d017d8baf375905cc472f95c02c8bdec441d11` (`c1998bb7b77da05f595ac98c8f72c32c672bd4ef241e767763e442fd155c0fbe`) passed the real held-generation case and the expanded own-facts case. The provider saw the expected private notepad, completed goal and pending intention with their exact text before and after restart. The reply settled once, and the refused dependent move left the successful speech intact. A same-cut diagnostic on the previous slice found byte-identical canonical receipt input through the typed and JSON round trips. The actual saved digest replayed exactly after restart. These are local correctness checks.

### Direct first-person reply facts on the managed worker

Campaign `2d5cfbe1-2735-448a-8eb4-9c63fb3f9a29` compared the JSON handoff at `30fe2a4bf` with the typed handoff at `fc1e5006d`. The shutdown fix was in both builds. The change passed private notes and selected first-person reply facts directly between Rust components. Provider HTTPS and PostgreSQL still use their existing formats. The measured change excludes later typed captures, scene questions, learning and Journal work.

The standard 16 GiB worker ran three interleaved 180-second repetitions per arm after warmup, each on a fresh PostgreSQL database. The seed-73 opening had one player, ten human NPCs, ten deer, five hares and 1,246 scenery records. It used the 2 GiB transient profile, one simulation worker, the normal clock at 60 game seconds per wall second, one-second saves and controlled HTTPS responses. All six runs completed 34 scheduled walks across warmup and measurement, two applied and saved replies, and a cold reopen that found the original receipt. Every server exited cleanly. Fixture provider charges were zero. The collected record contains 83 verified files and the exact source, executable and input digests.

Values are median / average / p95. There are three samples per arm for whole-window metrics, so their p95 is the largest run. The three latency rows use 96 in-window walks per arm. The fixture records the accepted action on the player stream. First position change and rendering latency were unavailable in this comparison.

| Metric                                                   |                   JSON control |                          Typed |
| -------------------------------------------------------- | -----------------------------: | -----------------------------: |
| Server CPU, % of one logical core                        |          42.40 / 42.74 / 43.46 |          42.45 / 42.14 / 44.70 |
| Exclusive PostgreSQL CPU, % of one logical core          |             6.01 / 6.15 / 6.45 |             5.93 / 6.15 / 6.61 |
| Achieved game speed, % of intended rate                  | 100.0001 / 100.0000 / 100.0003 | 100.0021 / 100.0101 / 100.0277 |
| Command response, ms                                     |               6.6 / 6.8 / 12.8 |                6.2 / 6.3 / 8.9 |
| First accepted action on the player stream, ms           |            61.5 / 62.8 / 104.2 |             58.5 / 58.9 / 87.3 |
| Command to first confirmed durable receipt, ms           |         611.5 / 615.9 / 1070.8 |         628.7 / 617.6 / 1089.2 |
| Server plus PostgreSQL, CPU ms per completed game second |          8.142 / 8.147 / 8.246 |          8.061 / 8.048 / 8.551 |
| Concurrent server and PostgreSQL memory peak, MiB        |          521.2 / 519.3 / 543.4 |          521.5 / 524.5 / 540.5 |
| Cold reopen to usable view, ms                           |              990 / 1004 / 1047 |             1025 / 1001 / 1066 |

Both arms offered 10,800 game seconds per run. Completed time ranged from 10,799.956 to 10,800.031 in the control and 10,800.043 to 10,802.994 in the candidate. The difference includes stream sampling around window boundaries. The live clock's internal elapsed-time debt was unavailable. The client consumed a median 0.83% of one logical core in each arm and the fixture harness 1.33% in each, recorded separately from the server and PostgreSQL. Server CPU already includes its Rust workers. Receipt checks poll every 100 ms, so that latency includes the wait to observe the commit. The comparison excludes administrative rewind.

Median committed transactions were 9,172 versus 9,310. Median PostgreSQL rows returned/inserted/updated/deleted were 1,597,459/26,021/71,615/9,244 versus 1,100,677/26,129/72,027/9,776. These are database-level counters and include fixture reads. Median WAL growth was 98.4 versus 98.0 MiB and median database growth 32.9 versus 30.6 MiB. Statement counts and prepared bytes were unavailable. Whole-process transient/resident/pending-save peak medians were 134.9/173.1/7.13 MiB versus 131.6/175.5/7.13 MiB. All three current reservation counters returned to zero after shutdown in every run.

**Disposition.** Keep the direct typed handoff for exact text and clearer ownership. The isolated performance result is inconclusive. Median combined CPU per game second fell about 1%, and complete-run CPU ranges overlapped. Automatic NPC jobs varied from 171–209 in the control and 153–239 in the candidate, while both arms completed the fixed player workload. The observed stream tail improvement does not by itself establish a durable change in movement latency.

The controller reported cleanup, and EC2 confirmed the retained worker stopped. The campaign settled at an estimated $0.578122. The continuing shared estimate is $95.152524 including separately accounted earlier work. An older $1.325803 remains reserved separately from actual usage. These are task-ledger estimates.

### Personal recall, current offers and browser commands

The Rust listener reads selected personal bodies directly from their stored payloads and renders current work, feelings and activity choices from typed captured facts. It also moves automatic queue inputs and authorized walk/cancel inputs as Rust values. Command learning and receipt signatures still use their original ordered and canonical bytes. The bridge keeps its actual byte-format callers.

On frozen source `108edda5bc4199619a76a2e97af2b571169cf6fa`, all three disposable PostgreSQL journeys passed. The real chat prepared optional recall through controlled HTTPS while the player walked. A valid reply applied and persisted once. Withdrawal stopped final generation, and cancellation settled the attempt without applying a reply. Repeating a movement request returned the original result and a changed body with the same ID was refused. A new login could not recover the older command receipt. The original session still recovered that receipt after cold restart. The executable SHA-256 is `4605935614a01edfdb4fc704c13d15a7575bd2ce2afa3db7a72d65305b93ddb4`. The storage SHA-256 is `59ea4f718a922b4e5008798e50fe808e8068f1c1832c9263d812dcaf1d3b1844`. The fixture archive is `native-runtime-foundations/nsc04-first-reply-20261121.LsAlK7Y8/`, runs `final-typed-move-2`, `final-typed-withdraw` and `final-typed-cancel`.

Frozen source `1fe672d64eef254647f7595d9d7245e19a7020d8` also passes identity, purpose, suggestion selection and personal-source ordinals directly as Rust values. The three `typed-clean-*` runs repeated the real moving, withdrawal and cancellation cases on independent databases, with the same exact replay and restart checks. In the withdrawal run the required privacy revision changed before the final request. The run that cancelled during settlement ended without a new effect. All cleaned up. The executable is `40c957535df231b1b987f55a35d5c6a7b6351044efc838c7289cfafe3360921e` and current storage is `6297b93ba0c128df82282bb778de9541e66937794d6b59a484c1dde4250a393d`. Earlier joined preparation attempts refused mismatched release inputs before listening.

Chromium `157.0.8103.79` inspected Camp hearth through the remembered-place list, moved once and recovered the exact position after restart. That run used release source `db0bcbeaa2ec0469081e0230a066855411f87036`, executable `7f5b76ead348b90ab605d1600f6915b4235e2e7c1d011ca3056defbf37e6d3d6` and the same storage hash. Raw result `r3-shared-launch-place-3/result.json`.

Positive appraisal and plan fields, paused cancel and isolated managed runs still require separate witnesses. These are correctness results.

The next direct handoff also keeps response aliases, offered ordinals and selected evidence in Rust values through the binding turn. The queued input holds its own storage until the existing original/current checks finish. At `aa39b3cc16dd27e5b06cb93e7a43b89b07a99a41` (executable `5c77b000702c4437a4bf5c695a7caf21cb9de068f39b3de19b91bf0ed487c523`), the three `direct-bindings-*` cases repeated the moving, withdrawal and cancellation journeys with saved receipt recovery. The completing request made three actual controlled judgments and one generation. It applied one reply. The two unsuccessful cases applied none. All three databases were removed after clean shutdown. The bridge still uses the shared validated selection through its byte API.

At the same identities, `direct-bindings-final-move-3/result.json` holds the PostgreSQL dispatch-intent write after reply preparation and before the final generation request. An unrelated walk from x=24.35 to x=24.05 was visible while that write was held. The permission and source check allowed the request after release, and one controlled answer applied, saved and recovered on a cold process. The browser, server and database cleaned up. The actual disclosure itself remains synchronous with current authority.

### A received-scene question followed by a reply

The stand-alone Rust conversation routes now support one batch of separation questions about the NPC’s original observed bodies. Their measurements use the same received time ranges as attention. The reply preparation lends only the actual original evidence and binds the supporting facets before the final disclosure. The final generation has its own admission and receipt. Direct answers need one generation, and a mixed request for a question and an operation gives neither a live preview nor a saved effect.

Local frozen source `4abc8f136a115513205fb808b4771c43c43015de` and executable SHA-256 `da18a927dde959cb2af9986cc1d3ac3fd775416555e46d5a83cfe5a7bd846094` exercised signed-in HTTP and streaming, controlled Macrofold HTTPS and separate real PostgreSQL databases. The measured pair used the old received position even after an accepted walk while the first answer was held. Its second request carried four opaque evidence references. Chromium `157.0.8103.79` received the final speech through the normal gameplay stream. Repeating the request and cold reconnect recovered one accepted player utterance and one applied NPC reply. A foreign reference returned unavailable without any supporting references. Required-source withdrawal and cancellation prevented the second call. An independently recorded synthetic charge exhausted the second call’s allowance, retained the first receipt and produced no reply. The actual preview stream emitted the valid direct answer once and withheld the mixed response. Fixture charges are synthetic. Actual additional and cumulative provider cost for these checks is $0.

Raw cases are `situation-fenced-{move,withdraw,cancel,forged}-cold`, `situation-fenced-stream-{direct,mixed}-actual-job`, `situation-fenced-second-budget-actual-ledger` and `situation-fenced-browser-walk-cold` in the existing NSC04 verification directory. An earlier positive query exposed a real validation failure. The Rust validator refused the reviewed schema's `description` annotation on the nonempty query branch. The corrected parser admits the annotation and still validates its surrounding structure and reference values. These local cases cover separation, direct speech and refusal. Nearby bodies, broad-region expansion, boundaries, history and historical-spatial measurements remain open, as do equivalent active-work and idle cost comparisons.

### Shutdown during an automatic NPC commit

An advisory lock on an isolated PostgreSQL fixture held the automatic scheduler at the actual `COMMIT`. The player’s accepted movement was visible and still needed the final save. On `a782ad14f45b`, stopping the server dropped the scheduler's transaction future. The writer closed admission as designed for an unknown outcome. The final save failed with `WriterUnavailable` and the process exited with status 1.

The `b8d017d8baf3` release let the in-flight pass finish and register its task before draining the NPC jobs. The ordinary saver stayed available through that drain. The same held-commit check then saved the move, exited successfully and recovered the move on a cold process. Both fixtures cleaned up their owned databases. The diagnostic made no provider requests.

### Preparing attention for its actual scheduler caller

The compact wake check and the check that an earlier read is still current keep their ordered cue, evidence and event witnesses. They skip the complete attention view and its encoding. The latter also skips rebuilding printable names, attributes and the presentation of a prior action result. The full prepared trigger and addon still get the same view through the shared reader.

Each local build passed three real PostgreSQL and controlled-HTTPS journeys. A due optional cue produced one decision and stayed spent after restart. Withdrawing the cue prevented the decision. An addressed conversation applied once without spawning a second thought for the same speech. The control is tree `801b03e137b3` and executable `f5e5c205ee0c6`. The candidate is tree `10646d102e37` and executable `c122f9d0e6c6`. The six completed results are the `*-r2` directories under `nsc04-npc-intake-needed-20261122`. The first probes used an obsolete fixture-export argument and never started either listener. All disposable databases were removed. Complete gameplay CPU remains unmeasured for this change.
