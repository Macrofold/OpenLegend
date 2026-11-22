# Decision fallback implementation and verification

Updated **2026-10-22**. **Luna Low fallback is enabled by default** for the configured primary decision model. Eligible unresolved decisions receive at most one separately funded request. Existing character actions and native simulation continue while it waits; the eventual proposal must still pass current permissions, world rules and decision-expiry checks.

[Current behavior](../ai-providers.md#decision-escalation) · [Feature specification](../projects/decision-escalation-feature-spec.md) · [Technical design](../projects/decision-escalation-tech-design.md) · [DE01–DE05](../maintainers/cognition-redesign.md#decision-escalation) · [Limits](../limits/ai-execution.md#decision-escalation-limits) · [Model comparisons](../benchmarks/README.md).

## Background capacity — October 22

At the owner's explicit request, the shared background allowance is 100 operations
per server process. A no-provider exercise through the actual scheduler reached
100 simultaneous held operations, queued the 101st, and admitted it after one
release. Restored uncertain attempts each occupied one position; settling one
released only that position. Repeated local release did not free another position.

The existing decision/maintenance fixtures produced 68 passes and one missing-export
failure while unrelated animal-navigation edits were in progress. Once that export
was available, the failed check and an extended real-PostgreSQL recovery check both
passed. The latter reconstructs two uncertain attempts, admits 98 other background
operations, refuses further admission at 100, then frees exactly one position on a
known completion without a price; financial obligations remain. Full TypeScript
and production TypeScript compilation pass. The two-pending-attempt SQL plan uses
the existing unsettled-attempt index and exact link-key lookups. No provider calls were made. These
checks establish scheduling/accounting correctness, not live throughput, memory or
character quality at 100; the broader release gates below remain open.

## Live gameplay with Luna Low

The test used the production browser build, real HTTP server, automatic simulation ticks, disposable PostgreSQL/pgvector worlds and actual direct OpenAI Responses calls to `gpt-6-luna` with `reasoning.effort: low`. The first two conversations used the full wilderness and ordinary browser speech controls. Only the primary failure was supplied by the test; Luna's structured answer, spending admission, current-world checks, speech and persisted outcome were real. Unrelated optional model work was suppressed to keep the experiment bounded; native simulation remained active. These are orchestration checks, not a measure of how often Jev naturally needs fallback or how accurate subjective answers are.

| Gameplay check                                                                              | Luna call, including test delay | World time advanced during the recorded wait | Observed result                                                                             |
| ------------------------------------------------------------------------------------------- | ------------------------------: | -------------------------------------------: | ------------------------------------------------------------------------------------------- |
| Browser question about making camp quieter                                                  |                          4.84 s |                    283.75 game seconds at 1× | Ada's actual answer was spoken once and the decision finished.                              |
| Second browser question, with the real answer held for at least 15 seconds                  |                         15.10 s |                  453.14 game seconds at 0.5× | Answer applied once; 19 animals changed position while waiting.                             |
| Separate native human-movement check, with another real answer held for at least 15 seconds |                         15.16 s |                    919.11 game seconds at 1× | Mara walked 2.12 metres and finished that action before Luna returned; Ada then spoke once. |

Request time includes transport/decoding; clock advancement is measured between captured wait boundaries, so the intervals differ slightly. The deliberate delay is test latency, not a claim that Luna itself needed 15 seconds. In the final check Mara moved from `(9.5, 0, 13.5)` to `(8, 0, 15)` through normal native admission, with intermediate movement recorded while the request was pending. For that separate diagnostic, the test directly declared the initial answer unusable and limited the character’s view to 14 metres. It skipped preparing the initial model request, while retaining the real fallback coordinator, two-second dispatch deadline, permissions, spending and native publication. The browser Events panel subsequently showed Ada saying, “Could we keep voices gentle around the fire, and leave room for people to talk without having to shout?” The ordinary player click-to-walk check also succeeded, but its movement occurred after the delayed answer returned; it is not counted as concurrent movement.

**Limits:** the initial model failure was controlled. A natural Jev → Luna gameplay run remains unverified because the local Macrofold service returned database-shape errors. Three cold speech preparations exceeded the one-second dispatch deadline before a real model request. No deadline, spending check or freshness guard was relaxed. These failures establish the limits of this experiment; they do not invalidate the observed Low reply or concurrent movement.

## Native and browser verification

Existing controlled-client checks exercise the actual request preparation, shared scheduling, financial reservations, native action/response owners and durable publication. These establish implementation behavior, not model accuracy:

- A usable primary answer buys no fallback. A permitted unusable answer or abstention can buy one Low request; unknown primary completion blocks another purchase.
- A still-useful late primary answer can act once. Current plan, body, source, permission, rule or deadline changes prevent obsolete effects. Slowly changing meters are tolerated only within an explicitly allowed meaningful condition.
- Concurrent claims fund only one child. Failed dispatch or save acknowledgements retain uncertain execution capacity until durable completion is established. Restart ends unfinished decisions without replaying paid calls or effects.
- Accepted speech or actions are not repeated when another independent part fails. Feeling creation and updates use the native appraisal owner, exact permitted source and installed value type/range.
- Optional memory selection cannot remove required evidence. Fallback preparation buys no embeddings, summaries or additional interpretation calls.
- The direct Responses transport uses `gpt-6-luna`, low effort, strict structured output, no tools, no streaming and `store:false`, even when ordinary generation uses Macrofold.
- Off mode makes no fallback calls. Funded observation mode records an answer without effects. Apply mode rechecks and commits eligible proposals. Missing credentials, price or allowance prevents dispatch.

Three recorded browser journeys cover authorized inspection, the existing owner conversation, and a delayed NPC reply with readable failure and preservation of the player's newer unsent draft. Private HTTP checks cover permission revocation. The inspector distinguishes proposed from committed actions, immediate deferral from a resolved answer, and actual cost from uncertain reservations. Its reads perform no inference.

Actual Medium calls previously exercised the same native feeling owner in an explicitly opted-in fixture: an apology reduced one frustration record from 0.50 to 0.20 without creating a duplicate. This establishes native integration for that submitted proposal, not current Low emotional quality. The saved result passed the current-format reader. Bundled decision-time appraisal was disabled at the time of this trial. The current bundled world opts in fear and anger through its [authored definitions](../../packages/domain/src/worlds/base/appraisals.ts).

## Ordinary appraisal on the stand-alone Rust server — November 22, 2026

A signed-in player asked an NPC about a nearby sound. The ordinary reply supplied only that NPC’s permitted evidence, current feelings and installed options. The controlled HTTPS reply chose the authored fear definition at intensity 0.5. Rust saved one private feeling and recovered the same result on replay and cold reopening. A proposed cause absent from the supplied options was refused before application.

After the first feeling was resolved, a new request on the cold server selected the same remembered occurrence. The exact prior-outcome lookup refused a second creation. The reply’s independent speech still applied, and the original resolved record stayed byte for byte. This lookup borrows the selected accepted save cut and accounts for matching pending writes and deletions. The separate case with an earlier outcome still in pending rows remains unverified. A confirmed ordinary save failure deliberately stops subsequent mutation, so an injected save error was unsuitable for that case.

During a held valid reply, the ordinary clock and movement continued and PostgreSQL saved the walk before the model response arrived. The original reply then applied once. Forgetting its exact cause while another reply was held refused the response with no effects. Cancellation separately applied nothing. The original requests stayed recoverable without another provider attempt. The controlled calls incurred $0 in new and cumulative Jev cost. The checks establish behavior, including application after unrelated movement and refusal after withdrawal. They do not measure model quality or performance.

The cases in local archive `nsc04-standalone-appraisal-20261122` use executable SHA-256 `6ffe8826624fa30587f82d280c0108cb9f8e1e692e8a7e5a23e9bc0d04c15868`. The archive preserves a failed cold fixture that tried a recipient reference from the previous session. Reconnecting and selecting the current permitted recipient completed that check. The locked Rust build, TypeScript and network checks passed. All disposable databases were removed.

## Private NPC naming on the stand-alone Rust server — November 22, 2026

An NPC can change a private name during an ordinary reply to a signed-in player. The name may refer to a currently observed individual or an independently recognized person in the NPC’s selected memory. Rust supplies the exact name revision and the installed world’s naming rules apply the edit. Remembered references authorize the name edit only. They convey no physical target, speech recipient or access to a private note.

The authenticated conversation and controlled HTTPS provider saved one private name for a nearby individual and one for a person outside sight, in separate worlds. Both saved their exact Unicode text and supporting evidence, survived cold reopening and recovered the same request receipt. The player’s view never exposed either private name. A completed walk saved while another reply was held, and the valid reply then applied once. A forged reference failed response validation. A valid reference with a stale revision refused the name change and still let independent speech apply.

Forgetting the exact original evidence stopped generation when held after judgment and refused effects when held during generation. Cancellation also left no name or reply. Replaying the original request did not make another provider attempt. Controlled Jev calls incurred $0 in total across these cases. The cases establish correctness for the authorized names. No live model quality or speed was measured.

The local archive `nsc04-standalone-naming-20261122` records eight passing callers and the original failing control with no naming choices in the provider request. The local locked build from `095ad47e6` and the scoped naming patch used executable SHA-256 `c40e0396bd6674618241401639bfdbd9c6d5a87adce797da304d9155e039854b`. The Rust build, new-module formatting and network checks passed. All disposable databases were removed.

## Live policy comparison

All **48/48 fresh cases received an answer and delivered it**. Jev chose an accepted answer in every case, so the enabled policy correctly bought **zero** stronger-model calls. The comparison is complete; it shows no measured benefit on this small, straightforward sample.

| Configuration             | Correct / answered |       Weighted points | Answers delivered | Mean delivery | 95th percentile | Maximum | Estimated cost per 1,000 cases |
| ------------------------- | -----------------: | --------------------: | ----------------: | ------------: | --------------: | ------: | -----------------------------: |
| Jev fast-only baseline    |    48/48 (100.00%) | 6,400/6,400 (100.00%) |             48/48 |        0.45 s |          0.93 s |  1.17 s |                          $0.35 |
| Jev with fallback enabled |    48/48 (100.00%) | 6,400/6,400 (100.00%) |             48/48 |        0.45 s |          0.93 s |  1.17 s |                          $0.35 |

Both policies use the same actual first answer for each case; this does not count two paid Jev runs. All **12/12 immediate-only cases** were both correct and delivered within one second. The episode-grouped 95.00% interval for added weighted points is **0.00–0.00 percentage points**: there were zero corrections, zero regressions and zero missing answers. This does not satisfy the positive-improvement production-release criterion. These local service/persistence timings are not pure inference, a rerun of the older 4,000 questions, or representative dense-world/browser latency.

## Qualification harness

The [qualification commands](../../scripts/decision-benchmark/README.md#decision-escalation-qualification) run the production trigger resolver, coordinator, prompt, decoder and scoped answer consumer. Six authored episode families yield 48 related views, including twenty trackers, up to 539 memories, conflicting accounts, consent, injuries and instructions embedded in fictional text. Related views stay grouped when estimating the paired uncertainty interval.

The controlled-answer run delivered all 48 judgments with 24 scripted fallback calls and no provider spend: eight initial answers were corrected, twelve missing answers were supplied, and none regressed. The trigger identified eight of sixteen scripted initial errors, while four already-correct answers also triggered. These numbers verify the harness and show that legal but poor choices can remain undetected; they are not Jev or Luna quality estimates. An abstaining fallback does not erase an interpretable initial answer. Rejected or late proposals remain visible in quality grading; timely delivery and correctness are separate.

The scoped-choice tool does not measure conversational usefulness, emotional appropriateness or invalid committed gameplay effects. Native integration has its separate checks above; human assessment remains open.

## Load and storage observations

The no-network load tool measures actual native preparation, shared scheduling, publication, continuous simulation and PostgreSQL. Workloads request 100 or 1,000 opportunities across twenty actors or one concentrated actor, at 1× and 8× simulation speed, with twenty extra authored trackers, 539 memories per actor and 20,000 retained completed attempt records. This service measurement excludes HTTP, event delivery and browser rendering.

The final matrix at source `83085a065` completed **all sixteen configurations**, with a declared thirty-second bound each. **Five completed their requested workload, ten reached the bound with work unfinished, and one stopped at an explicit busy refusal after 14/1,000 admissions.** No observed interval made zero native progress and no storage failure occurred. At most four waiting descriptors retained 32,768 bytes in total. The monthly spending read ranged from 4.27 to 63.51 ms. This does **not qualify sustained 8× simulation or a supported population size**.

Pending execution and interrupted-dispatch recovery use indexed unfinished attempts and exact link lookups. The monthly spending check still sums applicable ledger history; it is not constant-time accounting. [DE-L03](../limits/ai-execution.md#de-l03--attempts-permissions-and-spending) records the scaling limit. Queue bounds protect integrity under overload; they do not guarantee a useful answer before its deadline.

## Remaining release qualification

The implementation and bounded gameplay checks do not establish all of the following:

- Natural primary failure followed by Luna in a healthy Macrofold environment; the measured gameplay test controlled the primary failure.
- A positive quality improvement from the actual runtime trigger policy. The live 48-view policy comparison triggered no fallback.
- Human approval of emotional appropriateness, conversational usefulness and character consistency.
- Representative deployment latency, population capacity or sustained accelerated simulation. Cold preparation can exhaust the immediate dispatch deadline.

Default activation was explicitly authorized despite these broader release limits. Optional confidence/margin triggers remain disabled until calibrated on held-out episodes. These requirements stay open in [DE05](../maintainers/cognition-redesign.md#de05--actual-escalation-benchmark-and-controlled-activation); the benchmarks do not supply runtime answer keys.

## Current source verification

At executable source `076ce95a3`, the complete automated suite passes **790 tests in 56 files**, using two workers, disposable PostgreSQL databases and no provider requests. Type checking, production build, formatting, generated configuration and guidance checks pass. Failure specimens confirm that an unknown provider execution blocks new work until a definitive completion receipt arrives, while unpriced spending remains accounted for.

Four additional controlled failures through the actual memory-maintenance and embedding callers cover lost dispatch acknowledgements, lost settlement acknowledgements and uncertain provider completion. Each preserves occupied execution capacity until durable completion is established; a failed dispatch acknowledgement sends no provider request. These are implementation checks, not model-quality measurements.

Offline reproduction of the final 4,000-question comparison preserves every model's accuracy, points, factual-error counts, latency and cost metrics exactly. The current corpus audit and local documentation links pass. Private evidence is under `decision-merge-readiness-20261017`. The live gameplay and load observations above retain their original measured scope; these source checks do not requalify those workloads or close the remaining release requirements.

## Spending and evidence

Implementation checks, candidate comparisons and live gameplay together have **$3.014457485 in known usage estimates** and **$3.8010494 in conservative exposure** under their shared $10 allowance. Exposure includes the older $0.25 OpenAI uncertainty, 34 unpriced Microsoft failures, a $0.25 Macrofold reflection reservation, $0.042088 in uncertain Jev gameplay reservations and accounting buffers. These totals overlap and must not be added. Real spending records remain intact even when a test failed.

The three Low gameplay requests cost an estimated **$0.0091284** in total. Additional priced Jev cost in those checks was **$0**, with the $0.042088 uncertainty reported separately. Cumulative reported Jev estimate across the branch is **$1.231822**. This source/documentation review made no paid requests: additional Jev cost is **$0**. The [full comparison](decision-api-benchmark.md#spending) owns the combined authorized benchmark exposure; these are estimates and reservations, not settled invoices.

Private evidence remains outside Git: `decision-fallback-gameplay-20261017` contains request bodies, returned answers, current-world outcomes, financial records and time/position samples. The load profile retains actual admissions and progress for every configuration; source commits and execution patches identify each measurement. [Candidate studies](../benchmarks/decision-fallback-models.md) retain their own exact inputs, frozen grading and attempt journals. No application save, private memory or real accounting record was replaced for this review.
