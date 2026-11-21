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

The 15 steady windows in these two campaigns recorded 1,824 automatic jobs prompted by current physical relations, 586 prompted by events, and zero optional-discovery jobs. The counts come from durable jobs. Individual jobs can use more than one model judgment. Slowing optional curiosity further would miss the work exercised in this opening.

**Recall, scheduler intake, and body deadline comparisons remain open.** Campaign `8080089e-123b-4eec-853d-8aa47d11b53c` froze candidates `9da6700c34fc`, `3488206b08d7`, and `2eab0b629e8e`, respectively, against the common control. AWS access expired after the worker started. Collect and verify the original campaign, including worker cleanup, before deciding whether to keep each change. The final integrated cold-continuation check and the focused check that missing job ownership cannot expose a status row are still open on the final retained code.

## Matched 180-second windows

Each entry gives median / mean / p95, control → candidate. The CPU figures use three steady windows per arm, with all server threads counted once and PostgreSQL measured separately. First movement ends at stream receipt. The latency figures pool 96 steady walks per arm. Savings acknowledgements use the database observer.

| Experiment              | Server CPU, % of one core             | PostgreSQL CPU, % of one core   | Game speed, % of intended                         | Paired combined CPU change, % |
| ----------------------- | ------------------------------------- | ------------------------------- | ------------------------------------------------- | ----------------------------- |
| Compact job status      | 43.02/44.91/50.12 → 45.29/45.87/47.28 | 5.90/6.30/7.16 → 6.02/6.08/6.26 | 100.000/100.000/100.028 → 100.000/99.991/100.000  | +8.05 / -10.99 / +9.63        |
| Lexical reuse           | 43.02/44.91/50.12 → 44.72/44.46/45.91 | 5.90/6.30/7.16 → 6.27/6.31/6.50 | 100.000/100.000/100.028 → 100.000/99.992/100.000  | +7.18 / -8.54 / +0.35         |
| Speech ownership lookup | 50.13/50.13/52.23 → 49.06/51.34/55.97 | 6.66/6.66/6.90 → 6.52/6.55/7.08 | 100.000/100.000/100.001 → 100.000/100.010/100.028 | -6.80 / +1.49 / +11.52        |

| Experiment              | Command response, ms        | First movement receipt, ms        | Durable acknowledgement, ms             | Combined CPU, median ms/game-second | Concurrent memory peak, median MiB |
| ----------------------- | --------------------------- | --------------------------------- | --------------------------------------- | ----------------------------------- | ---------------------------------- |
| Compact job status      | 8.6/8.7/14.0 → 7.0/7.8/13.3 | 68.9/64.4/105.3 → 66.6/59.9/95.8  | 567.2/581.9/1057.7 → 573.1/592.1/1062.7 | 8.142 → 8.552                       | 519.4 → 537.6                      |
| Lexical reuse           | 8.6/8.7/14.0 → 7.0/7.4/12.1 | 68.9/64.4/105.3 → 60.1/58.3/100.8 | 567.2/581.9/1057.7 → 544.2/567.1/1059.6 | 8.142 → 8.483                       | 519.4 → 530.4                      |
| Speech ownership lookup | 7.3/8.0/14.0 → 7.1/7.3/10.4 | 49.7/50.8/77.4 → 56.6/56.5/93.8   | 548.3/581.4/1088.5 → 606.5/595.4/1102.1 | 9.423 → 9.251                       | 569.8 → 571.6                      |

Database and allocation figures below are steady-run medians except for the transient reservation peak, which covers the whole server lifecycle. SQL trips and transferred bytes come from the focused wire trace. The ordinary table uses the database-wide scan and commit counters.

| Experiment              | Database commits | PostgreSQL scan counter | WAL, MB      | Database growth, MB | Transient reservation peak, MiB | Client CPU, % of one core |
| ----------------------- | ---------------- | ----------------------- | ------------ | ------------------- | ------------------------------- | ------------------------- |
| Compact job status      | 8703 → 9360      | 1936817 → 981267        | 95.4 → 109.6 | 29.7 → 33.9         | 188.5 → 187.3                   | 0.84 → 0.86               |
| Lexical reuse           | 8703 → 9052      | 1936817 → 2696296       | 95.4 → 104.2 | 29.7 → 33.5         | 188.5 → 187.6                   | 0.84 → 0.84               |
| Speech ownership lookup | 9241 → 8697      | 1263344 → 1144020       | 97.9 → 100.6 | 32.3 → 33.1         | 185.2 → 185.9                   | 0.93 → 0.92               |

| Experiment              | Control source | Candidate source | Frozen campaign                        | Completed runs |
| ----------------------- | -------------- | ---------------- | -------------------------------------- | -------------- |
| Compact job status      | `36ea64692091` | `99d097da43e2`   | `89f67b13-dbbf-4604-b73b-47be2a55f2ef` | 6/6            |
| Lexical reuse           | `36ea64692091` | `ef5a3191f3a5`   | `89f67b13-dbbf-4604-b73b-47be2a55f2ef` | 6/6            |
| Speech ownership lookup | `4173d7a41315` | `a9bce622ddf7`   | `dc40cf1e-ff6e-4c9a-86aa-e81c871a1dbf` | 6/6            |
