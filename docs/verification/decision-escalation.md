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

## Offered NPC actions on the stand-alone Rust server — November 22, 2026

The stand-alone release offers the model installed action choices and exact invocations, plus expression choices where supported. Its provider schema and both instruction sections now share that capability. Free-form action proposals require a separate interpretation path. Source and Node-hosted default instructions and proposal choices retain their original bytes.

A signed-in conversation on the original release reproduced an advertised proposal and independent speech reaching the server together. Generation completed once, then native response preparation requested the unavailable interpreter and recorded `response-application/application`. The player’s speech saved, but the NPC never answered. On the corrected release a supported movement request visibly moved the NPC 0.35 m and saved with one NPC reply. The original receipt and effects survived retry and cold reopening. A provider test that deliberately returned the unoffered proposal recorded `generate/invalid-output` with no effects or second attempt. A valid but conflicting appraisal separately refused its own effect while independent speech saved. Forgetting the exact history supporting a held valid reply prevented all effects.

The local archive `nsc04-standalone-proposal-offer-20261122` preserves the original failure, exact exporter source at `cc319036b` plus the verified patch, and the same Node-free executable in both arms (SHA-256 `a4950d9c15471591f16ed5849fb4d3b63300a1a653142548434d3dc83708ddf4`). The archive records original and corrected release manifest hashes and confirms the corrected cognition SHA-256 `ca539de594e5c6b9582d7e6954cb716fc58edae952b4f6eea5ce86469587234e`. Controlled HTTPS incurred $0 in new and cumulative Jev cost for these checks. TypeScript, formatting and network checks passed. All 12 disposable fixture databases were removed. No speed comparison or live model-quality claim was made.

## Configured offered-action fallback on the stand-alone Rust server — November 22, 2026

The ordinary automatic decision keeps its original evidence, deadline and allowed actions when a completed first assessment finds no suitable action. The configured fallback can ask the stronger model once to choose among those exact offers or abstain. It uses the existing spending ledger, sends the request directly over HTTPS and checks the same evidence before disclosure and application. An uncertain first attempt cannot fund the additional call.

Seven controlled journeys covered Apply, Off, Observe, uncertain first completion, withdrawal before dispatch, withdrawal after dispatch and an answer outside the offered set. In Apply, the NPC chose a two-berry gift from 13 offers while another signed-in player's walk saved. The gift, its response receipt and all three attempt records survived cold reopening. Repeating the command recovered the original receipt. Observe recorded the choice with no gameplay effect. Withdrawal before dispatch sent no request, and withdrawal after dispatch settled the attempt without applying the gift. All disposable databases were removed.

The cases ran at tree `f6991b8d8f46` and executable SHA-256 `57e3630050ffeef9c152258d4f270dd2c0e6930a5c066f55f95a9b19a5c4ae29`. Local archive `nsc04-decision-choice-fallback-20261122` retains the request, application, settlement, verification and cleanup evidence. Its manifest SHA-256 is `59cadc285a20df34b67caa5ea033d5317fc0b8f30c9a6a9b80ee50f0cbc11c7b`. The locked build, module formatting and network checks passed. The HTTPS provider was controlled locally, for $0 external cost. The remaining stand-alone fallback triggers and action families require their own caller checks.

A completed primary action rating with a malformed value can also trigger configured `invalid-output` recovery. The original actor, evidence, and offered choices stay bound. The final Rust build used the exact configured Macrofold deployment as the primary origin, selected one of 13 ordinary choices through Luna, and saved one two-berry transfer. Unrelated player movement saved while the direct response was held. Warm replay and cold reopening preserved the original receipt and all three attempt records. Turning off this reason or returning an uncertain primary completion made no direct request. Withdrawing the evidence while Luna was held refused the action after correctly settling the original charge.

The same configured default-model rates now own the direct request's reservation and settlement. The paid-request estimate counts the already serialized wire bytes and the existing framing allowance. On the controlled 100-input/24-output-token receipt, explicit default-model prices settled 257 synthetic micro-USD. The existing level-four decision allowance also blocks an over-budget reservation even when the NPC's monthly budget can pay it. In a separate pair the earlier build reserved 17,793,192 synthetic micro-USD and sent the expensive request. The final build refused the same setup before reserving or sending a direct request because the per-decision allowance was 2,500,000 micro-USD. All provider work was controlled HTTPS and actual external spend was $0.

The initial held test did not reach direct HTTPS and did not capture the terminal condition. The equivalent held replay passed with the same final executable. Both results are preserved, and this does not establish a performance or reliability rate. Exact tree `70a09ec67661d7ab2fc29f444feefcf5e154a847`, executable SHA-256 `611ecaac74c4fce8f4530b4eb62a40f4713c60024f256a23f143c1b3f9bf2379`, private archive `~/.codex/verification/OpenLegend/native-runtime-foundations/nsc04-decision-invalid-rating-20261122`, manifest SHA-256 `d23af0f3046cc47cf63a0362bcac72460a16ee44eb8d1690107cb47e1bbbe92b`. The case list and per-case cleanup records are in the manifest.

### Unconfirmed completion during optional action assessment

November 23, 2026. The earlier stand-alone build treated an unconfirmed assessment as a completed malformed answer. It sent one additional generation request and applied a two-berry gift. The repaired build records `action-attention/completion-unconfirmed`, keeps the original attempt's spending reservation and sends no generation request. The gifts and response effects stayed absent. A separate completed malformed assessment still allowed one ordinary generation, and the gift and original receipt survived exact retry and cold reopening.

The matched control is `239d3f512` with executable `03f916121a1c`. The candidate tree is `1284392a9a46ea8b3601637167a94ea24fff107f` with executable `5a45ad6e78b6`. Both candidate outcomes and the matched control use the real controlled HTTPS caller. Their attempt status and amounts survive cold reopening. Controlled HTTPS cost $0, and there were zero remaining temporary databases. One preliminary control used an earlier incompatible installed artifact and stopped before gameplay. It is preserved separately from the three completed cases.

### Recovering from a refused NPC action

November 23, 2026. A signed-in player offered an NPC two berries, then walked beyond reach while the NPC's first assessment was held. Both Rust builds saved the exact out-of-reach refusal and left the berries in place. The repaired build saved that refusal before starting one configured higher assessment. It offered the still-valid choices from the original set, including Follow, and excluded both unavailable gift replies. The controlled answer selected Follow and saved exactly one running plan under its own response ID. The original command and outcomes survived cold reopening.

The higher decision stops at an accepted pause, even if the world resumes before the held response arrives. A frozen control paused and resumed during the first assessment and still sent one higher request and applied its answer. The repaired build saved the original action refusal and sent no higher request. Pausing after higher HTTPS started discarded its answer and applied no child effect or receipt. The already-started attempt kept its conservative spending hold. A fresh decision started after resume again saved one Follow. Pausing while the initial route question was held also stopped higher dispatch without losing the original refusal. All completed cases reopened and cleaned up. A separate earlier-origin control was incomplete because its fresh gift menu no longer offered Accept.

The recovery pair has result hashes `5290297a22aa` and `266c8eb0a325`. The pause control, held assessment, held higher response and fresh-after-resume result hashes begin `22c48aaf4869`, `d0c8b6ab0926`, `77d4c0b0d2ee` and `2387ce7ec426`. The earlier-origin fix used tree `a189fc2476701cf638fdcad10111477cc0e17c15`, executable SHA-256 `7a5b2b5fe0ab7da96739850e30a07151b5735c7effe7d7512b6745a15349e631` and result `42e4b7a0fb70`. Locked build, touched-line formatting and network boundary checks passed. All responses used controlled HTTPS with $0 external cost.

### When the assessment exceeds Macrofold's input limit

November 23, 2026. The primary assessment returned Macrofold HTTP 413 with the exact `input_too_large` code. This documented check happens before an invocation. The Rust server saved a settled zero-charge receipt and, when configured, made one higher assessment using the original permitted offers. The selected gift transferred two berries once and stayed saved after cold reopening. The frozen control ended at the primary refusal.

The candidate passed seven caller cases. Throttling, failed authentication, a 413 with a different code, the same code on an uncertain 503 and operator Off made no higher request. The uncertain attempt kept its original hold. Withdrawing the original memory while the primary request was held refused higher disclosure and settled the provisional attempt at zero. No effect was saved. All results and original receipts survived reopening, and all disposable resources closed.

Frozen source tree `7c99620dc50ac8c13280ad75e0aaf21f096d59f5`, executable SHA-256 `f86bdbce963c9603d0f40af3601fa6814bd1be2abe7501be71bbf064a0b35406`. Positive result SHA-256 `5a0330fb739f3c820c2fc403fcef2a41ce5e93eb6184568442333186755f373b`, control `9cecdb26`, and remaining result prefixes `9dcd8d20`, `f5e23011`, `d9fa0e27`, `6f2807c9`, `e8f98eec` and `d990509e`. Locked build, touched-line formatting and network checks passed. The controlled HTTPS calls incurred $0 external cost.

## Remembered aliases in Node-hosted Rust replies — November 22, 2026

An ordinary player conversation reproduced a reply refusal before generation. The bridge classified a remembered person as a visible body because the person existed in its wider perception roster. Rust correctly refused that body because the reply had not selected it. The bridge now uses the current visible selection for physical references. Remembered aliases still resolve through their permitted evidence or recognized identity.

With the same authored opening and controlled HTTPS, the player walked to Rina and used the ordinary conversation route. Rina’s exact reply saved once, and the receipt and identical request recovered the result without another generation. An independent creator-authorized case withdrew the exact acquired speech while generation was held. The original attempt settled as stale and applied no reply or other effect. Its saved receipt and retry agreed. The separate refusals of autonomous responses with outdated required outcomes remained in the diagnostic logs.

Local archive `nsc04-node-response-alias-20261122` records corrected app tree `eba867e39b64e1fb49deb99e5131124d3bc8e5b2`, unchanged addon SHA-256 `5f77cf677afd2b8bd1661488dd744a52e501f67e6b5133d1911cb88b73107b6c`, and the original refusal. Both focused listeners exited cleanly and their databases were removed. The withdrawal harness reached its one-conversation stop but missed the browser worker’s stop acknowledgment. Controlled calls incurred $0 of Jev cost. These cases establish reply and privacy behavior. They do not qualify the longer workload or performance.

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
