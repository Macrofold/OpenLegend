# OpenLegend decision-model benchmark

Results completed **October 17, 2026**. Luna low, medium and high each have **4,000 / 4,000 answers** and **80 / 80 separate structured outputs**. Native Luna Decisions returned **3,999 answers and one explicit refusal**; all its requests completed. Every question has an answer key. Accuracy means **correct answers divided by answers received**; missing answers do not count as wrong decisions.

**Current result:** Spark 1.3 Contributor has the highest measured accuracy among received answers. Luna Decisions is the fastest measured configuration in this full comparison. Jev and all three ordinary Luna efforts cover all 4,000 questions; Luna Decisions declined one; Microsoft and Spark retain the documented input-size gaps. Existing usable answers were preserved, and only unanswered requests received new calls. Dates, concurrency and completed inputs differ, so this is not a controlled provider-speed ranking.

For the October 17 follow-up, see the [complete fallback retest of all 267 recorded Jev misses](../benchmarks/decision-fallback-models.md#all-267-recorded-jev-misses-complete-comparison). It compares Luna none/low/medium and three native decision configurations on the complete known gap. Low offers the better delayed-reasoning tradeoff; Luna Decisions offers the strongest measured speed and full-context coverage. These targeted results do not replace this 4,000-question comparison.

## Answer quality

This is the master comparison. All seven configurations target the same 4,000-question set. “Points” gives partial credit for reasonable alternatives; it is not the percentage correct. “Factual mistakes” counts contradictions of supplied facts or constraints among answers that can support that additional check.

| Model                 | Answered / question set | Correct / answered (accuracy) | Points / 100 | Factual mistakes / checked | Average / 95th-percentile seconds | Estimated cost / 1,000 requests |
| --------------------- | ----------------------: | ----------------------------: | -----------: | -------------------------: | --------------------------------: | ------------------------------: |
| Jev 1.13              | 4,000 / 4,000 (100.00%) |        3,733 / 4,000 (93.33%) |        97.48 |         70 / 2,728 (2.57%) |                      5.19 / 23.02 |                           $1.00 |
| Microsoft Decision 1  |  3,424 / 4,000 (85.60%) |        2,863 / 3,424 (83.62%) |        94.35 |       320 / 2,319 (13.80%) |                      6.03 / 24.27 |                           $0.64 |
| Luna Decisions        |  3,999 / 4,000 (99.98%) |        3,608 / 3,999 (90.22%) |        96.33 |        137 / 2,727 (5.02%) |                       0.36 / 0.92 |                           $1.82 |
| Luna low effort       | 4,000 / 4,000 (100.00%) |        3,676 / 4,000 (91.90%) |        96.75 |        137 / 2,728 (5.02%) |                       5.69 / 8.42 |                           $2.73 |
| Luna medium effort    | 4,000 / 4,000 (100.00%) |        3,827 / 4,000 (95.67%) |        98.30 |         15 / 2,728 (0.55%) |                     10.56 / 18.12 |                           $2.99 |
| Luna high effort      | 4,000 / 4,000 (100.00%) |        3,848 / 4,000 (96.20%) |        98.48 |         10 / 2,728 (0.37%) |                     19.58 / 36.40 |                           $3.49 |
| Spark 1.3 Contributor |  3,994 / 4,000 (99.85%) |        3,863 / 3,994 (96.72%) |        98.58 |          7 / 2,724 (0.26%) |                     32.53 / 58.87 |                           $2.87 |

Times measure one scene request, which contains two to seven questions. The measurements include requests that returned usable answers; Luna Decisions' partially refused request counts once. “95th percentile” means 95% of measured requests finished within that time. Costs are the average per measured request multiplied by 1,000, so two-decimal rounding remains useful; this is not a separate batch price. For example, Jev’s $1.00 per 1,000 requests means about one-tenth of a cent per request. These full-scene timings differ from the smaller [fallback candidate requests](../benchmarks/decision-fallback-models.md#all-267-recorded-jev-misses-complete-comparison). Earlier and new calls ran at different times and concurrency, so these are observed integration timings, not a controlled provider-speed ranking.

## How the scores work

- **Accuracy:** an accepted answer passes. Equally acceptable alternatives get equal credit. Ordered ratings are rounded to the nearest category before grading.
- **Points:** sum all earned points and divide by all possible points for received answers. Each question offers 100 points. A reasonable alternative can receive partial credit; a contradiction can receive zero. These weights are authored judgments, not measured gameplay harm.
- **Factual-error check:** an additional test for clear contradictions. All 4,000 questions receive ordinary grading, but only **2,728** support this narrower check. “Lift overhead despite this wrist injury” can clearly violate a supplied constraint. “Sound disappointed rather than irritated” can miss a preferred emotional answer without being factually impossible. We keep emotional questions because believable character reactions matter.

For the requested score that subtracts clear errors, use **(checked answers − factual mistakes) ÷ checked answers**. Jev scores **2,658 / 2,728 = 97.43%**. This does not credit unexamined subjective answers or claim the engine actually executed or rejected these proposals.

### Ordered ratings use the nearest category

**1.11 becomes 1**, for both accuracy and points. A genuine probability estimate stays continuous; we do not round an 80% chance to “yes.”

For the urgency example, the supplied categories are: 0 = over twenty minutes spare; 1 = over five through twenty; 2 = zero through five; 3 = no qualifying plan finishes in time. A plan taking **35 minutes** with **39 minutes** remaining leaves four minutes, so category **2** is correct. An answer of **0.18** rounds to 0 and remains wrong. Clamping only keeps a number within the offered scale; it cannot correct a wrong category.

## What was tested

The set has **724 character situations**, containing **2,628 multiple-choice questions, 728 yes/no-or-probability questions and 644 ordered ratings**. Related situations deliberately change memory order, mood or available evidence; these are not 4,000 independent stories. The largest supplied history has **539 remembered entries**. Complex situations combine twenty character meters or personal limits, injuries, conflicting feelings and thirty-two possible schedules. Some mechanics are explicitly hypothetical future-world rules.

The engine supplies authoritative stock and reservations. The model chooses plans that respect those facts, the character's limitations and permissions; it does not reconstruct inventory from remembered transfers. All 4,000 questions have an answer key and none is excluded from ordinary grading. The [corpus audit](decision-benchmark-audit.md) explains the construction, disclosed subjective reference changes and remaining biases.

## Answer coverage

- **Jev and ordinary Luna low/medium/high:** each answered 4,000 / 4,000 questions.
- **Native Luna Decisions:** 3,999 / 4,000 (99.98%). One completed request explicitly declined a question about a construction route for bypassing private-memory permissions. The accepted answer was “no supported route.” The refusal remains visible in coverage and is excluded from correct/answered accuracy.
- **Microsoft:** 576 questions in 96 requests exceed its model context limit.
- **Spark:** six questions in one request exceed Macrofold's input-size limit.
- **Structured outputs:** all four generative configurations returned 80 / 80 outputs. Native decision APIs do not support this separate generation task.

All feasible unanswered requests were attempted to completion. A fresh request could fill a service failure; it could not replace an already usable wrong answer. Inputs were not shortened to remove a provider's capacity failure. Failed attempts and unresolved charges remain in financial records, separately from answer quality.

## What the results suggest about escalation

The game now has **Luna Low fallback enabled by default** for eligible unresolved decisions. The [fallback comparison](../benchmarks/decision-fallback-models.md) tests **all 267 recorded Jev misses**. The [gameplay verification](decision-escalation.md) records real gameplay with a deliberately delayed Luna answer. The world and characters continued moving during that wait. Full-comparison scores here and targeted fallback scores answer different questions; neither gives the running game access to the benchmark answer key.

A retrospective analysis of Jev's unchanged 267 misses found 70 clear factual errors. Checks derived from the supplied situation could identify 66: **55 deadline calculations, four feeling-decay calculations, six choices below a supplied minimum energy reserve, and one forbidden feeling target**. The calculations belong in native code when those rules are installed. The seven forbidden choices could be rejected against their supplied rules. These checks covered 1,812 applicable answers in an already inspected synthetic set; they are not an installed universal game validator or a guarantee on new situations.

The other 201 misses comprised 136 feeling-selection/intensity disagreements, 46 memory-relevance disagreements, ten tone disagreements, five evidence interpretations, two routing choices, one reflection choice and one probability estimate. Four evidence interpretations were the remaining factual errors; the other 197 were different kinds of reference disagreement. Passing a world-rule check does not establish good judgment on these cases.

The [fallback specification](../projects/decision-escalation-feature-spec.md) and [implementation verification](decision-escalation.md) own actual triggers, late-answer checks and outstanding release requirements.

## Detailed totals, latency and cost

The master table contains average and 95th-percentile latency and average cost. This table adds the raw point totals, slowest request, and cost percentiles. Costs again use a per-1,000-request scale. All measured successful requests have usage-based cost estimates.

| Model                 | Earned / possible points | Requests measured | Slowest seconds | Cost observations / measured requests | 75th / 95th-percentile cost, scaled to 1,000 requests |
| --------------------- | -----------------------: | ----------------: | --------------: | ------------------------------------: | ----------------------------------------------------: |
| Jev 1.13              |    389931.33 / 400000.00 |               724 |           76.63 |                             724 / 724 |                                         $1.21 / $2.17 |
| Microsoft Decision 1  |    323055.32 / 342400.00 |               628 |           82.13 |                             628 / 628 |                                         $0.97 / $0.97 |
| Luna Decisions        |    385242.50 / 399900.00 |               724 |            9.45 |                             724 / 724 |                                         $2.21 / $3.99 |
| Luna low effort       |    386995.37 / 400000.00 |               724 |           30.74 |                             724 / 724 |                                         $3.29 / $5.51 |
| Luna medium effort    |    393196.60 / 400000.00 |               724 |           27.90 |                             724 / 724 |                                         $3.61 / $5.83 |
| Luna high effort      |    393938.50 / 400000.00 |               724 |           56.96 |                             724 / 724 |                                         $4.30 / $6.43 |
| Spark 1.3 Contributor |    393729.00 / 399400.00 |               723 |           88.74 |                             723 / 723 |                                         $3.51 / $5.21 |

Jev’s **5.19-second average** measures the complete tested integration, including Macrofold/OpenRouter, large contexts and question batches. It does not measure bare model computation. The separate single-question and smaller-batch [fallback studies](../benchmarks/decision-fallback-models.md) observed much shorter times. Different dates, caches, request sizes and concurrency prevent treating the difference as a controlled speed improvement.

## Spending

The complete benchmark has **$12.49 in known usage estimates** and **$18.68 conservatively accounted for**, including unresolved charges from failed attempts. These overlapping views must not be added. Together with the separate fallback experiments, conservative exposure is **$22.48**, within the authorized **$100**. Usage estimates are not reconciled invoices.

The final Luna completion consisted of 403 requests costing **$1.029595425** in usage estimates, with no unpriced or uncertain new requests. **Additional Jev cost for that completion and this documentation review is $0.** Cumulative reported Jev estimate across the branch is **$1.231822**, with **$0.042088 in separate unresolved Jev reservations**. Missing bills are not assumed to be zero. Full-precision financial journals remain private.

Luna estimates use the [official API prices](https://developers.openai.com/api/docs/pricing), checked October 17; [native Decisions has its own input-only rate](https://developers.openai.com/api/docs/guides/decisions#pricing-and-availability). Recorded usage and the exact requested model/effort determine each estimate.

## Structured outputs and verification

Choices can select complete structured actions and feeling changes, including target, intensity and duration. Another **80 separate tasks** ask ordinary LLMs to generate JSON containing a plan, feeling operation, expression style and optional speech/thought. These tasks are outside the 4,000-question master table.

“Plan and legal feeling” requires the expected JSON shape, an accepted plan and a permitted feeling operation. “Also matches feeling/tone” additionally requires the authored emotional and expression references. Prose quality remains separate; new speech and thoughts still need human review.

| Model                 |     Answered / 80 | Plan and legal feeling / answered | Also matches feeling/tone / answered | Mean / p95 / maximum seconds | Estimated cost / 1,000 requests |
| --------------------- | ----------------: | --------------------------------: | -----------------------------------: | ---------------------------: | ------------------------------: |
| Luna low effort       | 80 / 80 (100.00%) |                 80 / 80 (100.00%) |                     67 / 80 (83.75%) |           3.43 / 4.67 / 5.87 |                           $1.54 |
| Luna medium effort    | 80 / 80 (100.00%) |                 80 / 80 (100.00%) |                     64 / 80 (80.00%) |          5.50 / 8.75 / 11.86 |                           $1.65 |
| Luna high effort      | 80 / 80 (100.00%) |                 80 / 80 (100.00%) |                     67 / 80 (83.75%) |         8.56 / 15.76 / 36.35 |                           $1.87 |
| Spark 1.3 Contributor | 80 / 80 (100.00%) |                  72 / 80 (90.00%) |                     59 / 80 (73.75%) |        33.85 / 55.96 / 61.89 |                           $1.67 |

| Model                 | Cost observations / requests | 75th / 95th-percentile cost, scaled to 1,000 requests |
| --------------------- | ---------------------------: | ----------------------------------------------------: |
| Luna low effort       |                      80 / 80 |                                         $1.55 / $1.59 |
| Luna medium effort    |                      80 / 80 |                                         $1.69 / $1.82 |
| Luna high effort      |                      80 / 80 |                                         $1.93 / $2.18 |
| Spark 1.3 Contributor |                      80 / 80 |                                         $1.75 / $1.97 |

## Evidence and limits

Reports bind each retained answer to its exact model, settings, complete input and source journal. Both grading policies have frozen identities. The final comparison preserves every previously usable answer and includes all 403 completed Luna requests with complete usage. Exact input fingerprints, accounting and source proofs make the results reproducible without another paid call.

This is an authored synthetic benchmark with **21 disclosed broadened subjective references**, not an independently human-validated answer key. Related memory-order, mood and option-order views are correlated. No benchmark proposal was executed in the game. These results do not establish natural long-term character quality, guaranteed response times or production population capacity.

The final completion used source commit `cfafbba25`, with execution source patches and exact model/input fingerprints retained privately. Evidence is under `decision-benchmark-luna-completion-20261017/final/`: complete comparison records, source proofs, grades, request distributions and accounting. The input collection is `decision-benchmark-clean-4000-20261016`. Raw outputs and financial journals remain outside Git. Current source checks and runtime evidence are recorded in the [implementation verification](decision-escalation.md); the [audit](decision-benchmark-audit.md) owns current corpus measurements.

[All benchmark results](../benchmarks/README.md) · [Harness instructions](../../scripts/decision-benchmark/README.md) · [Corpus critique](decision-benchmark-audit.md) · [Project scope](../projects/completed/decision-api-benchmark.md) · [DB01](../maintainers/cognition-redesign.md#db01--synthetic-decision-api-comparison)
