# Models for difficult character decisions

Results measured **October 17, 2026**. **Luna Low is the selected generative fallback.** On the 208 judgment questions among Jev's known misses, Low and Medium earned 83.99% and 84.11% of possible points; their mean requests took 2.66 and 3.68 seconds. Low remains a background answer that can take several seconds. Luna Decisions is the fastest measured option-selection candidate, with lower agreement; it cannot replace the speech-generation role.

These tests compare candidate answers. They do not show that gameplay can detect every wrong primary answer. [Runtime triggers and limits](../ai-providers.md#decision-escalation) and [actual gameplay verification](../verification/decision-escalation.md) answer those separate questions. [The full comparison](../verification/decision-api-benchmark.md) measures all 4,000 questions rather than only difficult ones.

## All 267 recorded Jev misses: complete comparison

This test includes **every one of Jev’s 267 recorded misses** from the 4,000-question benchmark, across **236 original scenario contexts**. Each model received the original character evidence, missed questions and offered choices. Questions Jev previously answered correctly were omitted; one request contains one to three missed questions sharing the same scenario. The references and partial-credit rules were frozen before these new calls. Related versions of a scenario are still related evidence, not independent game situations.

This is a deliberately difficult repair test, **not overall model accuracy**. Jev’s original whole-corpus result remains 3,733/4,000 correct (93.33%). Its fresh 22/267 below shows that repeating these difficult questions usually did not repair them. The character evidence and options were preserved, but narrowing the question group can also change an answer; this is not a pure measurement of random variation on identical complete requests.

### Master comparison

Accuracy is correct divided by answered. Points are total earned divided by total possible for answered questions, with 100 available per question. Answer coverage remains visible beside those scores. Timings measure a **successful answer request**, including transport, and exclude the original primary attempt, gameplay queue, game validation and publication. Microsoft’s fast failed requests therefore do not improve its reported answer latency. For the three format-error repeats described below, latency is the successful repeat request; the earlier failed attempt and manual wait are not included.

| Model                |    Answered / 267 | Correct / answered |     Points earned / possible | Mean answer request | 95th percentile | Maximum |
| -------------------- | ----------------: | -----------------: | ---------------------------: | ------------------: | --------------: | ------: |
| Repeat Jev 1.13      | 267/267 (100.00%) |     22/267 (8.24%) | 17,267.67/26,700.00 (64.67%) |              0.53 s |          0.87 s |  3.73 s |
| Microsoft Decision 1 |  229/267 (85.77%) |   129/229 (56.33%) | 19,022.78/22,900.00 (83.07%) |              0.77 s |          1.20 s |  3.72 s |
| Luna Decisions       | 267/267 (100.00%) |   134/267 (50.19%) | 21,222.00/26,700.00 (79.48%) |              0.21 s |          0.49 s |  0.87 s |
| Luna, reasoning off  |  266/267 (99.63%) |   130/266 (48.87%) | 21,017.67/26,600.00 (79.01%) |              1.42 s |          1.96 s |  4.54 s |
| Luna Low             | 267/267 (100.00%) |   185/267 (69.29%) | 23,197.50/26,700.00 (86.88%) |              2.66 s |          5.04 s | 18.08 s |
| Luna Medium          | 267/267 (100.00%) |   193/267 (72.28%) | 23,322.50/26,700.00 (87.35%) |              3.68 s |          7.12 s | 19.27 s |

All **1,416 planned requests were attempted**, plus three explicitly bounded format-error repeats. Microsoft returned answers for 202/236 scenario requests: its 34 failures left 38 questions unanswered. Every failing context exceeds the current production input allowance; the largest contain 512 memories. The pattern is consistent with its [published 32,768-token limit](https://openrouter.ai/microsoft/microsoft-decision-1), but Macrofold’s public receipt supplies only a generic provider rejection, so the precise upstream reason is not proven. Those are coverage failures, not 38 incorrect decisions, and none was retried with shortened evidence.

Reasoning-off Luna initially returned malformed JSON for three requests. One fresh, exact-input attempt per failed request returned usable JSON for all three; two answers were correct and one remained wrong. Both attempts and their costs remain recorded. In this format-recovery step, no well-formed wrong answer was retried. One separate question, `selected-joy-private-q3`, still received an explicit “unsupported” abstention, so this model answered 266/267. Low, Medium, Luna Decisions and Jev answered all 267. There was no unattempted work or unfinished remote execution.

### Which comparison matters for the game

**59 questions ask for deterministic calculations** such as deadline slack or feeling decay. The game engine should calculate these when the corresponding rules exist. Keep them in the complete test, but use the **other 208 questions** when comparing fallback judgment: feelings, tone, relevant memories, evidence and offered plans. Some of those plans also contain constraints that the engine must validate; a model’s selection grants no permission.

| Model                | Correct / answered on 208 other questions |     Points earned / possible | Correct / answered on 59 calculations |
| -------------------- | ----------------------------------------: | ---------------------------: | ------------------------------------: |
| Repeat Jev 1.13      |                            13/208 (6.25%) | 13,171.00/20,800.00 (63.32%) |                         9/59 (15.25%) |
| Microsoft Decision 1 |                          104/178 (58.43%) | 14,672.78/17,800.00 (82.43%) |                        25/51 (49.02%) |
| Luna Decisions       |                          105/208 (50.48%) | 16,192.00/20,800.00 (77.85%) |                        29/59 (49.15%) |
| Luna, reasoning off  |                          106/208 (50.96%) | 16,356.00/20,800.00 (78.63%) |                        24/58 (41.38%) |
| Luna Low             |                          132/208 (63.46%) | 17,470.00/20,800.00 (83.99%) |                        53/59 (89.83%) |
| Luna Medium          |                          135/208 (64.90%) | 17,495.00/20,800.00 (84.11%) |                        58/59 (98.31%) |

**Recommendation: Luna Low for a delayed reasoning fallback.** On the 208 questions other than calculations, Medium gained only **three** accepted answers over Low: 135 versus 132. Weighted points were **84.11% versus 83.99%**, while Medium averaged **3.68 seconds versus 2.66 seconds**. Five of Medium’s eight-answer net advantage in the full table came from calculations that belong in native code. Low is still unsuitable for a strict sub-second requirement: its 95th percentile was 5.04 seconds and its slowest request took 18.08 seconds.

For a fallback that must return within roughly one second, **Luna Decisions is the strongest speed/coverage candidate from this test**: every observed request finished within 0.87 seconds, with 134 accepted answers across the complete gap. Microsoft had higher accuracy among the smaller set it answered, but did not cover the largest contexts and its 95th percentile exceeded one second. Reasoning-off Luna supplied little extra judgment accuracy over Luna Decisions at much higher latency. Neither this nor the smaller supporting comparison establishes a guaranteed production deadline or authorizes arbitrary speech generation through a decision API.

### Useful answers within a deadline and cost

Here the denominator is all 267 selected questions: the fraction asks how many received a correct answer before the stated limit, rather than how often an answered question was correct. The clock starts at the candidate request, not at the original Jev call. Cost quantiles use attempts with known costs, including malformed replies; Microsoft’s 34 unpriced failures are excluded from these price averages and retained conservatively in the total exposure below.

| Model                | Correct within 1 s / 267 | Correct within 2 s / 267 | Correct within 5 s / 267 | Mean cost / 1,000 priced attempts | Cost p75 / 1,000 | Cost p95 / 1,000 |
| -------------------- | -----------------------: | -----------------------: | -----------------------: | --------------------------------: | ---------------: | ---------------: |
| Repeat Jev 1.13      |           22/267 (8.24%) |           22/267 (8.24%) |           22/267 (8.24%) |                             $1.03 |            $1.16 |            $2.13 |
| Microsoft Decision 1 |         113/267 (42.32%) |         129/267 (48.31%) |         129/267 (48.31%) |                             $0.67 |            $0.92 |            $0.93 |
| Luna Decisions       |         134/267 (50.19%) |         134/267 (50.19%) |         134/267 (50.19%) |                             $1.84 |            $2.07 |            $3.85 |
| Luna, reasoning off  |            6/267 (2.25%) |         126/267 (47.19%) |         130/267 (48.69%) |                             $2.35 |            $2.76 |            $5.08 |
| Luna Low             |            0/267 (0.00%) |          52/267 (19.48%) |         175/267 (65.54%) |                             $2.43 |            $2.83 |            $5.14 |
| Luna Medium          |            0/267 (0.00%) |          31/267 (11.61%) |         162/267 (60.67%) |                             $2.49 |            $2.90 |            $5.19 |

Most generative requests were uncached: reasoning-off Luna had 11 cached-input observations in 239 attempts; Low and Medium had eight each in 236. This is a different workload from the earlier fully cached seven-scenario repeats. Costs and latency are observed through these particular integrations, not a provider speed guarantee.

### Reproducibility

The 267-question selection came from the final 4,000-question corpus, authenticated against each retained input and model fingerprint. All references and points were frozen before new calls. The source `comparison-records.json` has SHA-256 `0d8bcd8ae46c4aba79744bffa061363859d3773f5629442b3690c922ea1b986a`. Private evidence under `decision-fallback-all-misses-20261017` contains the selection, first-usable answers, all attempt journals, metrics and execution source fingerprints (`fb84768e7`, `ec51bb39b`, `6ffb583b0` with captured patches). Runtime still rejects input above 100 KB; offline compilation permits full benchmark contexts to test model capacity independently.

## Supporting 48-scenario comparison

The broader comparison asked **48 independent scenarios**, one decision per request: twelve each about feelings, expressed tone, memory relevance and interpreting personal evidence. Sixteen scenarios supplied 32 memories, sixteen supplied 128, and sixteen supplied 256; each supplied twenty character meters. The scenarios use the existing hypothetical authored profiles, not newly installed game rules. Arithmetic, stock reconstruction and permission calculations were excluded.

All six configurations completed all **48/48 requests**. Each generative Luna configuration explicitly declined one question, leaving **47 usable answers**; none of these was a network failure. Accuracy and points below use the answers actually supplied. Every question offers 100 possible points, with equal full credit for accepted alternatives and partial credit for other reasonable choices. Points are the sum earned divided by the sum possible, rather than an average across models.

| Configuration        | Correct / answered | Points earned / possible | Average request | 95th percentile | Maximum |
| -------------------- | -----------------: | -----------------------: | --------------: | --------------: | ------: |
| Jev 1.13             |     41/48 (85.42%) |     4,619/4,800 (96.23%) |          0.46 s |          0.68 s |  0.84 s |
| Microsoft Decision 1 |     43/48 (89.58%) |     4,650/4,800 (96.88%) |          0.68 s |          1.01 s |  1.21 s |
| Luna Decisions       |     42/48 (87.50%) |     4,610/4,800 (96.04%) |          0.25 s |          0.63 s |  0.88 s |
| Luna, reasoning off  |     43/47 (91.49%) |     4,544/4,700 (96.68%) |          1.29 s |          2.20 s |  2.73 s |
| Luna low             |     45/47 (95.74%) |     4,643/4,700 (98.79%) |          2.40 s |          4.08 s |  6.75 s |
| Luna medium          |     42/47 (89.36%) |     4,526/4,700 (96.30%) |          3.05 s |          5.79 s |  7.61 s |

**On these 48 scenarios, Low matched 45 of its 47 answers (95.74%); it declined the other question.** This is not a score on all 4,000 questions or all recorded Jev misses. It does not establish that Low is universally more capable than Medium: the full 4,000-question comparison favored Medium. The test uses the actual server fallback prompt/schema/decoder, one unresolved question and no invented probability distribution for a generated choice. Native APIs use their native protocols with the same evidence and offered alternatives. Luna supports `none`, `low` and `medium`; it does not support `minimal`. [Official model settings](https://developers.openai.com/api/docs/models/gpt-6-luna).

The three declined answers were explicit `no-suitable-option` results: reasoning-off Luna declined an unrelated-memory relevance question; Low and Medium declined the same question about a carrier meeting's agenda. The supplied evidence did contain an accepted answer: the remembered meeting description explicitly concerns delivery windows and road repairs. These abstentions remain visible and are not retried to obtain a preferred prediction. All three generative configurations answered the same **46 questions**; on those, Low matched 44/46 (95.65%) and earned 4,543/4,600 (98.76%), reasoning-off Luna matched 42/46 (91.30%) and earned 4,444/4,600 (96.61%), and Medium matched 41/46 (89.13%) and earned 4,426/4,600 (96.22%). This supporting comparison avoids attributing the difference solely to their different abstentions; the table retains each model's complete answered sample.

### Repeated answers specifically where Jev disagreed

Jev disagreed with the reference on **seven** of the 48 scenarios: three feeling proposals, one expressed tone and three memory-relevance judgments. These were not seven forbidden actions. We froze those exact seven inputs, offered choices and references, then requested **five fresh answers per scenario per configuration**. That is **35 answers per model across seven independent scenarios**, not 35 independent situations. Selection was retrospective, using the completed Jev answers; this deliberately difficult subset is not general-population accuracy or an automatic gameplay error detector. All **210 requests** returned usable answers with known usage; there were no abstentions or service failures.

| Configuration        | Accepted / answered on Jev's original misses | Points earned / possible | Average request | 95th percentile | Maximum |
| -------------------- | -------------------------------------------: | -----------------------: | --------------: | --------------: | ------: |
| Microsoft Decision 1 |                               30/35 (85.71%) |     3,375/3,500 (96.43%) |          0.62 s |          1.35 s |  1.51 s |
| Luna, reasoning off  |                               26/35 (74.29%) |     3,239/3,500 (92.54%) |          1.34 s |          2.57 s |  2.79 s |
| Luna medium          |                               23/35 (65.71%) |     3,046/3,500 (87.03%) |          4.24 s |          6.69 s |  8.69 s |
| Luna low             |                               21/35 (60.00%) |     2,946/3,500 (84.17%) |          2.73 s |          4.73 s |  5.47 s |
| Luna Decisions       |                               20/35 (57.14%) |     2,925/3,500 (83.57%) |          0.19 s |          0.36 s |  0.42 s |
| Repeat Jev 1.13      |                               11/35 (31.43%) |     2,737/3,500 (78.20%) |          0.46 s |          1.00 s |  1.03 s |

Microsoft consistently matched six of the seven scenarios on all five repeats. Its five misses all chose a legally permitted tone outside the authored preference and received 75/100 points; they were not invalid actions. Reasoning-off Luna matched five scenarios consistently and the sixth once. Jev's fresh answer did sometimes change: it matched one memory case four times, another five times and one feeling case twice, but kept missing four scenarios every time. Repeating the same model can help, but these results do not support relying on it as a reliable repair.

| Configuration        | Correct within 1 second / 35 requests | Correct within 2 seconds / 35 | Correct within 5 seconds / 35 | Mean cost per 1,000 requests | 75th-percentile cost per 1,000 | 95th-percentile cost per 1,000 |
| -------------------- | ------------------------------------: | ----------------------------: | ----------------------------: | ---------------------------: | -----------------------------: | -----------------------------: |
| Microsoft Decision 1 |                        28/35 (80.00%) |                30/35 (85.71%) |                30/35 (85.71%) |                        $0.43 |                          $0.52 |                          $0.93 |
| Luna, reasoning off  |                         5/35 (14.29%) |                23/35 (65.71%) |                26/35 (74.29%) |                        $0.12 |                          $0.14 |                          $0.23 |
| Luna low             |                          0/35 (0.00%) |                 9/35 (25.71%) |                20/35 (57.14%) |                        $0.17 |                          $0.21 |                          $0.28 |
| Luna medium          |                          0/35 (0.00%) |                  1/35 (2.86%) |                19/35 (54.29%) |                        $0.26 |                          $0.32 |                          $0.41 |
| Luna Decisions       |                        20/35 (57.14%) |                20/35 (57.14%) |                20/35 (57.14%) |                        $0.95 |                          $1.16 |                          $2.07 |
| Repeat Jev 1.13      |                        10/35 (28.57%) |                11/35 (31.43%) |                11/35 (31.43%) |                        $0.55 |                          $0.67 |                          $1.16 |

The seven-scenario ranking differs from the complete 267-question ranking. It demonstrates variation on a selected small set, not a reason to override the broader Low recommendation. Native decision APIs select supplied options; these results do not qualify them for arbitrary speech or JSON generation.

All latency measurements start at the candidate request, include its complete reply and exclude the original Jev attempt, server queue and game publication. Those add time in a real fallback. No model here has demonstrated a guaranteed sub-second whole-decision deadline. Four workers and rotating submission order were used. The 48-case generative sample had **47 uncached and one cached request per effort**; uncached means were 1.29/2.42/3.00 seconds for none/low/medium. All 35 repeated LLM requests per effort had cached input, so the repeat prices are especially low and are not cold-request prices. Repetition reduces answer-sampling uncertainty on these seven cases, not uncertainty about unseen gameplay. The references were fixed before new calls; no answer key entered a model request, and no reference was changed after seeing the results.

## Spending and evidence

The complete 267-question experiment used **$2.53551192** in usage estimates, including three malformed-output repeats. Its Jev portion was **$0.243481** for 236 requests. The supporting 48-scenario and seven-scenario experiments, including preflight, used **$0.435164165**; their Jev portion was **$0.051325**. The latter's repeated LLM inputs were cached, so their prices do not represent cold requests. Microsoft's 34 failed large-context requests have no settled usage and remain conservatively reserved.

Cumulative reported Jev estimate across the branch is **$1.231822**, with **$0.042088 in separate uncertain gameplay reservations**. This consolidation made no paid requests: additional Jev cost is **$0**. [Combined accounting](../verification/decision-escalation.md#spending-and-evidence) includes implementation checks, all candidate studies and live gameplay; these overlapping totals must not be added again.

Private evidence for the smaller studies is `openlegend-fast-fallback-clean-20261017` and `openlegend-fast-fallback-repeats-20261017`, with source commit `8a0772420` and captured execution patches. The larger study retains exact inputs, frozen grading, every attempt and usage observation under the directory named above. The [harness instructions](../../scripts/decision-benchmark/README.md#fast-fallback-candidate-comparison) describe reusable commands. No model output was relabeled to make these comparisons pass.
