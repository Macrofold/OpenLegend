# OpenLegend synthetic decision benchmark

The current corpus contains **4,000 scored decision questions in 724 scenes**, plus **80 separate structured-generation tasks**. Eighty additional authored episodes have seven controlled views each, with 32–512 memories, twenty explicitly hypothetical trackers, functional injuries, personal history and proposed emotional reactions. Forty matched mood views and twelve difficult planning views reuse those episode groups. Twelve controls exercise selected joy rules that are not yet installed gameplay.

Every current question has an explicit accepted answer or answer set; none is excluded from scoring. Reports preserve the separate `referenceReview` interpretation, including 21 broadened subjective references where the supplied character history supports another reaction. Those revisions followed initial model observations and remain disclosed post-run amendments, not independent validation. Generation uses the same reviewed dense-scene references. A changed complete request requires a fresh model answer; earlier first usable answers may be reused only with identical complete prepared input, schema and model/effort settings, with source-journal provenance.

Score grading uses the nearest offered category: 1.11 becomes 1, exact halves round upward, and finite out-of-range values map to the nearest endpoint. Nonfinite output remains invalid. The original scalar and raw-reference result remain diagnostics; probability estimates and confidence are not rounded. A separate `scoreLevelAgreement` diagnostic compares the highest-scored offered level with the same reference. The benchmark selects its interpretation in advance, never whichever interpretation passes a particular answer.

The difficult planning views retain hundreds of memories, twenty personal limits and thirty-two proposed schedules. The engine supplies actor-permitted current quantities and reservations; the model chooses how to use those supplies rather than reconstructing stock from movement histories. Known plan costs and durations are supplied facts; comparing them with goals and remembered personal preferences remains part of decision reasoning. The [complete audit](../../docs/verification/decision-benchmark-audit.md) explains current construction and remaining biases. [Execution evidence](../../docs/verification/decision-api-benchmark.md) owns measured model results and accounting; [the project plan](../../docs/projects/completed/decision-api-benchmark.md) owns agreed completion.

## Models and equivalent outputs

The comparison has seven immutable configurations:

| Alias               | Execution                       | Model / setting                                                        |
| ------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| `jev`               | Macrofold native decision       | `typesafe/jev-1.13` through OpenRouter                                 |
| `microsoft`         | Macrofold native decision       | `microsoft/microsoft-decision-1` through OpenRouter                    |
| `luna-decision`     | Direct OpenAI Decisions         | `gpt-6-luna`                                                           |
| `luna-low`          | Direct OpenAI Responses         | `gpt-6-luna`, low reasoning                                            |
| `luna-medium`       | Direct OpenAI Responses         | `gpt-6-luna`, medium reasoning                                         |
| `luna-high`         | Direct OpenAI Responses         | `gpt-6-luna`, high reasoning                                           |
| `spark-contributor` | Macrofold structured generation | `meta/muse-spark-1.3-contributor` through OpenRouter, medium reasoning |

The native OpenAI adapter translates Noul into a probability-of-predicate question, Choice into supplied options and Score into ordered levels. Shared character evidence and question wording remain the same. [Official Decisions documentation](https://developers.openai.com/api/docs/guides/decisions) describes that protocol. Native-only models do not generate arbitrary JSON or speech. If OpenAI refuses one native question, the adapter preserves the other answers and records the refused question IDs; an entirely refused batch remains a refusal. Reports show question-level refusal coverage separately.

Ordinary LLMs receive a separately reviewed [prompt and strict schema](llm-prompt.ts). The prompt preserves evidence perspective, dates, corrections, units, consent, bodily limitations, uncertainty and independent questions. It treats dialogue and inscriptions as data, forbids invented effects and asks for exact offered handles. No gold answers, reference bands, rationale, difficulty labels or grading metadata enter a request. All LLM effort variants share that prompt. Their probabilities are self-reported estimates, distinct from native decision probabilities; no confidence is invented or paid repair call made.

A native choice can select a complete structured proposal: action, source-linked feeling with absolute intensity/target/lifetime, or expression style. The report retains that selected JSON. These proposals never execute game changes. A score's rubric position is never treated as an emotional amount. The separate generation lane instead requires genuinely generated plan/reaction/tone fields and optional speech/thought. Strict legality, subjective reference agreement and human prose review are separate results.

## Commands

Run from the repository root. Generated output must be outside the repository.

```sh
pnpm exec tsx scripts/decision-benchmark/main.ts validate
pnpm exec tsx scripts/decision-benchmark/main.ts audit
pnpm exec tsx scripts/decision-benchmark/main.ts audit --suite=baseline
pnpm exec tsx scripts/decision-benchmark/main.ts export --out=/tmp/openlegend-decision-corpus
```

`--suite=baseline|complex|selected|frontier|all` and `--split=development|challenge|holdout|all` select an experiment. Every view of an episode belongs to the same split; generation export follows the selected episode groups. These are reproducible development partitions of visible authored material, not an independently secret or human-validated test set. `complex` includes ordinary long and mood views; `frontier` contains the twelve compound views.

Export writes one bounded scene/task at a time using the same pretty JSON bytes and exclusive private files. This limits temporary output strings/buffers. Corpus imports still construct every view before suite selection; the measured memory floor and expansion constraint are recorded under [DB01](../../docs/maintainers/cognition-redesign.md#db01--synthetic-decision-api-comparison).

An explicitly authorized seven-model run, including generation tasks:

```sh
node --env-file=.env --import tsx scripts/decision-benchmark/main.ts run --live --out=/tmp/openlegend-comparison --billing-mode=byok --generation=true --cap-usd=50 --max-new=7
node --env-file=.env --import tsx scripts/decision-benchmark/main.ts run --live --out=/tmp/openlegend-comparison --billing-mode=byok --generation=true
node --env-file=.env --import tsx scripts/decision-benchmark/main.ts report --out=/tmp/openlegend-comparison --generation=true
```

The first command attempts one scene across all seven configurations. Inspect it before continuing. `--models=jev,microsoft,luna-decision,luna-low,luna-medium,luna-high,spark-contributor` selects configurations on a fresh run. Preserve suite, split and generation selection when resuming/reporting. Native decisions receive 724 scene calls each; generative configurations additionally receive 80 calls each, totaling **5,388 planned calls**. Initial concurrency defaults to four (manifest setting 1–4) and timeout to 180 seconds (1–300 seconds). A deliberate later execution phase may set `--workers=1` through `--workers=16`; each phase records its actual worker count, source commit and retained source diff before new admissions. Runtime fallback comparisons also capture their imported server prompt/decoder changes. Per-record phase labels and per-phase latency summaries keep that throughput change visible. Before admission, new untracked runtime files under the captured AI/benchmark paths must be added or committed so the retained source patch includes them; untracked tests and documentation do not block execution. Default output budget is 8,192 tokens, including reasoning. A token-limited incomplete answer is a recorded failure, with no paid retry.

`MACROFOLD_BASE_URL` and `MACROFOLD_API_KEY` configure Macrofold. Managed billing is the default; explicit BYOK uses `MACROFOLD_JEV_CONNECTION_ID` or `MACROFOLD_PROVIDER_CONNECTION_ID`. Contributor inference uses its exact model ID; the tool never enables account data-sharing settings or substitutes the ordinary Spark model. `OPENAI_API_KEY` configures the separately accounted direct Luna calls. Before local live execution, follow [Macrofold server reuse, startup and cleanup](../../docs/live-ai-setup.md#local-macrofold-server-lifecycle); an existing server remains under its owner's control. No game save or private memory is loaded.

`--stream-generation=true` opts Macrofold ordinary-LLM calls into streamed delivery, using the existing parser to assemble the same final validated answer. Native decision and direct OpenAI calls keep their existing delivery. Streaming records acceptance before consuming output; if delivery breaks, the client observes that same Run instead of submitting another inference. The original deadline and spending reservation remain in force. This option avoids Macrofold's separate sixty-second nonstreaming response-body deadline; it does not change the prompt, model, reasoning effort, schema or output allowance.

The delivery choice is frozen in the manifest/execution identity and each affected request's provenance. It cannot change while resuming a run; use a separately funded cohort sharing the task allowance. All delivery modes retain exact accepted Run/result validation. The tool does not automatically retry, change provider, alter reasoning effort or shorten evidence. Prompt/schema/arm/input hashes and the initial source revision are frozen in the run manifest; later execution phases retain their source commit and patch. A changed model, prompt, input or funding experiment needs a new run, still sharing the task allowance. Worker-count changes are recorded phases within the same ledger. Stop the previous writer first; operator-cancelled calls retain their outcomes and are not retried automatically.

External generation submissions can also be graded without providers:

```sh
pnpm exec tsx scripts/decision-benchmark/main.ts grade-generated --input=/tmp/submissions.json --out=/tmp/generated-report
```

Each submission supplies `caseId`, `model`, the exported generation `inputDigest`, `capability` (`supported` or `unsupported`) and, when supported, `output`. Duplicate or mismatched submissions fail. Native decision models cannot claim arbitrary-JSON support, whether named by their complete model ID or benchmark alias. Frozen grades remain intact; a separate `referenceReview` result uses the same disclosed reviewed references as live-run reports, with its policy digest and amendments. Speech/thought remains flagged for human perspective, factuality and quality review; a schema pass cannot establish natural prose quality.

## Fast fallback candidate comparison

`fallback-models.ts` compares **48 single-question requests per configuration**, rather than large multi-question batches. It selects one question from each of 48 independent existing episodes, before looking at any model answers: twelve each about feelings, expressed tone, memory relevance and evidence interpretation; sixteen each with 32, 128 and 256 memories, all with twenty hypothetical character meters. Arithmetic and stock reconstruction are excluded. The selected questions use the existing reviewed answer sets and points. This is a challenging sample of fallback-shaped work, not a claim that all 48 would trigger the production policy.

Luna uses the actual server fallback prompt, schema and decoder at `none`, `low` and `medium` effort. `minimal` is unsupported for GPT-6 Luna; `none` is its fastest supported setting. Native Luna Decisions, Microsoft Decision and Jev 1.13 receive the same evidence and offered answers through their native protocols. Generated selections retain their actual structured JSON without invented probability vectors. The full seven-model comparison remains separate; `luna-none` is explicitly experimental.

Set `OTHER_TASK_EXPOSURE_USD` to all previous charges and outstanding commitments for the authorized task. Keep the same value and private directory on resume; the journal adds this experiment's new costs. Inspect the first six answers before running the remainder:

```sh
node --env-file-if-exists=.env --import tsx scripts/decision-benchmark/fallback-models.ts --out=/tmp/openlegend-fallback-speed --cap-usd=10 --prior-commitment-usd="${OTHER_TASK_EXPOSURE_USD:?Set the existing task exposure}"
node --env-file-if-exists=.env --import tsx scripts/decision-benchmark/fallback-models.ts --out=/tmp/openlegend-fallback-speed --cap-usd=10 --prior-commitment-usd="${OTHER_TASK_EXPOSURE_USD:?}" --live=true --max-new=6
node --env-file-if-exists=.env --import tsx scripts/decision-benchmark/fallback-models.ts --out=/tmp/openlegend-fallback-speed --cap-usd=10 --prior-commitment-usd="${OTHER_TASK_EXPOSURE_USD:?}" --live=true
node --env-file-if-exists=.env --import tsx scripts/decision-benchmark/fallback-models.ts --out=/tmp/openlegend-fallback-speed --cap-usd=10 --prior-commitment-usd="${OTHER_TASK_EXPOSURE_USD:?}" --report=true
```

The first command is preparation only. The live commands share the existing journal, conservative reservations and rate control, with four workers, a 60-second observation limit and no automatic paid retry. Raw selection, rubrics, generated answers and receipts remain private. `fallback-comparison.json` reports correct/answered, earned/possible points, average/p95/max complete-request latency and correct answers within one/two/five seconds. Paired corrections and regressions use the newly observed Jev answers; these are offline diagnostics, not a runtime error detector. The experiment does not run game publication or change the production fallback model, activation or deadlines. [Measured results](../../docs/benchmarks/decision-fallback-models.md) distinguish it from actual full-policy qualification.

Live execution first checks Macrofold's existing health endpoint without submitting inference. A stopped API/database therefore fails before spending; this does not prove provider credit or protect against a later connection loss. For an explicitly authorized repeat study, use a fresh output directory and add `--focus-source=/absolute/completed-original-directory`. This selects the original Jev misses only after verifying complete priced source execution, identical input/reference digests and prior exposure covering the source. Keep original question IDs and options unchanged. Each repeat is a fresh experiment, not an automatic recovery call; add all preceding repeat costs before funding the next. Related repeats remain one scenario when interpreting uncertainty.

### All previously recorded Jev misses

Add `--corpus-source=/absolute/original-comparison-directory` in a fresh private output directory to test **every Jev reference miss** in its `comparison-records.json`. This is mutually exclusive with `--focus-source`. The import checks the original task/model fingerprints and requires Jev to have answered the entire reviewed corpus; an incomplete source cannot silently define a smaller test. The October 17 source contains 267 misses across 236 scenarios from 4,000 answered questions.

Keep the original character evidence, question wording, option descriptions and option bindings. Only previously missed questions are requested, grouped when they share one original scenario; previously correct questions are omitted. A fresh Jev answer can therefore change because of both model variation and the narrower question group. This is a study of known weaknesses, not overall accuracy on unseen game situations, and the saved answer key never enters model input. Related scene variants remain related evidence, not independent gameplay situations.

```sh
node --env-file-if-exists=.env --import tsx scripts/decision-benchmark/fallback-models.ts --out=/absolute/private-all-misses --corpus-source="${ORIGINAL_COMPARISON_DIR:?Set the complete source directory}" --cap-usd=10 --prior-commitment-usd="${OTHER_TASK_EXPOSURE_USD:?}" --live=true --max-new=6
node --env-file-if-exists=.env --import tsx scripts/decision-benchmark/fallback-models.ts --out=/absolute/private-all-misses --corpus-source="${ORIGINAL_COMPARISON_DIR:?}" --cap-usd=10 --prior-commitment-usd="${OTHER_TASK_EXPOSURE_USD:?}" --live=true
```

The same contract compiler, prompt, schema and decoder serve runtime fallback and this experiment. Offline compilation permits full retained contexts within the benchmark transport allowance, including contexts above production's 100 KB input limit. Runtime admission still enforces that limit unchanged; the study neither shortens memories nor claims those large requests would currently be admitted during play. Model-specific size refusals and explicit abstentions remain separate from incorrect answers. Report accuracy and points over answered questions, plus answered/selected coverage; latency is per complete scenario request. Report the full set and a separate judgment subset excluding arithmetic and deterministic decay calculations, which belong in the engine. Filtered studies omit incomplete mood/ordering comparisons rather than pretending they are complete paired experiments. The exact source predictions/digest, selected references, fresh raw answers and accounting remain private alongside the journal.

## Grading and fairness

Policy comparisons start from the same native computations and permitted alternatives in every arm. Do not credit a stronger model for filtering that the engine should already perform; a changed world after the original offer must be a declared separate intervention. Measure delivery after the owning save transaction acknowledges completion, using elapsed time from intake. A timestamp computed before COMMIT is not delivery; missing observations remain unavailable.

- Choice accepts the authored set of defensible alternatives. Emotional type/intensity and tone references permit mixtures and restraint; they are subjective references, not established psychological laws.
- Noul uses stated intervals, normally the correct side of 0.5. This threshold is a benchmark classification rule, separate from the game's action-selection threshold. Explicit chance questions retain their numerical interval.
- Score interprets the number as the nearest offered category before reference grading. The retained authored interval/tolerance identifies accepted categories; it no longer rejects 1.11 when category 1 is accepted. Raw scalar error is reported separately.
- The master comparison covers the same 4,000-question set for all models. Accuracy is reference matches divided by usable answers; points are earned divided by possible points for those answers. Failed/unattempted requests are service-completion results, not reasoning mistakes. Show answered/4,000 beside quality because missing difficult inputs can inflate apparent accuracy. Common-answered subsets remain supporting diagnostics, not a changing headline benchmark. `analyze` writes a readable `summary.md` master table alongside full-precision `detailed-metrics.json`. Human-facing percentages, timings and amounts use two decimals; costs are scaled to 1,000 requests to keep small nonzero costs legible.
- Brier/log loss is reported separately for binary Noul and multiclass Choice, only for eligible unique unambiguous labels with usable probability vectors. Raw scores are never normalized to manufacture calibration. Common-covered calibration prevents comparing different subsets unknowingly.
- Reports separate mechanical correctness, permitted reaction operations, authored emotional/tone references, grouped robustness, matched mood outcomes and current/selected/future scope. A same-feeling intensity change is reported only when both outputs name that feeling; different emotions are not subtracted as if interchangeable.

Option keys are genuinely re-keyed because sorting object insertion order does not survive HTTP canonicalization. The memory-order pair uses identical option bindings and identical 256 memories in opposite order. A separate option-order view holds context fixed. Plan handles and offered-plan order vary across episode seeds. Differing defensible selections do not automatically imply a robustness failure; joint reference success is reported alongside literal selection consistency.

### Supplemental answer points

Strict accuracy remains the primary exact-reference measure. A separate, post-run authored policy ranks every offered Choice answer with points and a source-based reason. All reviewed accepted alternatives tie at **100**. Other answers receive **75** for a reasonable useful alternative, **50** for incomplete but useful progress, **25** for a weak or irrelevant answer, or **0** for a contradiction or a stated constraint/evidence violation. Ties are intentional; factual distractors may all deserve zero. Concerns distinguish unsupported facts, physical/permission constraints, missed goals and subjective preferences. Zero points alone does not establish danger, and these authored weights are not measured gameplay harm.

Incomplete progress remains a strict failure: safe plans that miss quantity or deadline receive 25/50, and unnecessary deferral receives 25. Injury, energy reserve, consent, revised personal bounds and available-stock violations receive zero even if other requirements pass. A safe schedule one pad below the feasible maximum receives 75, and a larger shortfall receives 50. Permitted tones outside the subjective reference receive 75; permitted feeling kinds outside the reference receive 50, with 75/50 for one/more offered intensity steps within the same kind. These coarse authored preferences do not establish a universal psychological ordering or authorize executing any rejected plan.

Numeric questions use a separate **reference-closeness** measure: `100 × (1 − distance / declared span)`, with distance measured to the accepted interval. Score answers use the same nearest-category interpretation as accuracy, so an accepted category earns 100 points even when the raw number was 1.11. Actual probability questions remain continuous. Invalid values receive zero. For an open interval, its excluded exact boundary has zero distance and can receive 100 closeness while still failing strict correctness; `boundaryMiss` identifies that case. This measure does not imply action utility, probability calibration or similarity between different emotions. Choice points and numeric closeness remain separately available.

Freeze/export the source policy before examining predictions, then grade a retained normalized comparison cohort without provider calls:

```sh
pnpm exec tsx scripts/decision-benchmark/main.ts rank-answers --out=/tmp/openlegend-answer-points
pnpm exec tsx scripts/decision-benchmark/main.ts grade-points --source=/tmp/openlegend-answer-points/answer-points-policy.json --input=/absolute/comparison-records.json --out=/tmp/openlegend-answer-points-results
```

Both commands accept the existing suite/split selection. The saved policy must exactly match that selection and source; input records must match current frozen task/model fingerprints, and duplicate slots are rejected. This offline import validates comparison evidence; it does not replace the original journals as billing or recovery authority. Policy and cohort digests bind the result. Model inputs never include the points or reasons. Live/offline run reports include the same supplemental view under `referenceReview.answerPoints`; existing grades remain intact.

The nine historical exclusions are absent from the current executable corpus. Headline points use received answers; missing questions remain separate from reasoning quality. Whole-workload points are only a delivery diagnostic. Related episode views remain correlated observations. The eighty arbitrary-JSON generation tasks retain their separate field/legality/prose evaluation; they are not silently counted as decision questions. The original points policy was written after aggregate results and review examples were known. The current revision is frozen before fresh calls, with its changed corpus and rounding disclosed; it is not independent human validation.

### Clear objective error analysis

This additional analysis checks clear contradictions of supplied facts or constraints. Safe incomplete or merely suboptimal choices are not automatically factual errors. Subjective feeling/tone preferences, reasoning-route cost, optional attention/retrieval/reflection and exact chance calibration are unassessed by this extra check. Feeling proposals are checked for supplied operation/source/target rules, not whether a permitted feeling is psychologically best. Every one of the 4,000 current questions still has a reference and receives ordinary accuracy/points grading when answered. Report the actual checked denominator for each model rather than crediting unassessed answers.

The clear-error-free fraction is **(returned assessable answers − detected clear errors) / returned assessable answers**. Neither missing answers nor subjective questions the check cannot judge enter that denominator. Report raw errors and checked-answer counts, plus separate service completion, so absence of evidence is never credited as correctness. These remain authored benchmark judgments, not measured gameplay harm.

`strict` and `weighted` in the detailed report describe returned-answer quality; complete-workload arithmetic is explicitly nested under `deliveryDiagnostics`. Original frozen artifacts remain unchanged. Current corpus/reference/rounding changes receive new policy identities and fresh predictions wherever model inputs changed.

The factual check uses the same nearest-category helper as normal grading for explicitly objective Score questions. Other evidence-strength, semantic-completeness and status ratings still receive reference accuracy, but are not automatically factual violations when they miss it. Factual Noul questions use the benchmark's 0.5 truth threshold. Raw numbers, rounded positions and highest-scored categories remain separate diagnostics. The scoped runtime rating consumer has its own explicit task contract; this benchmark interpretation does not change it.

Freeze the source-authored policy before deriving model totals, then analyze retained comparison records offline:

```sh
pnpm exec tsx scripts/decision-benchmark/main.ts rank-clear-errors --out=/tmp/openlegend-clear-error-policy
pnpm exec tsx scripts/decision-benchmark/main.ts analyze --source=/tmp/openlegend-clear-error-policy/clear-error-policy.json --input=/absolute/comparison-records.json --out=/tmp/openlegend-detailed-metrics
```

Both commands preserve the selected suite/split. `analyze` checks the exact frozen policy before opening predictions and writes `summary.md` plus `detailed-metrics.json`, retaining accuracy, points, numerical diagnostics, common coverage and latency/cost evidence. Policy identities bind the selected current corpus; they are not independent human validation.

Neither zero answer points nor a detected clear error proves that the real engine would reject an action or that harm occurred. Native admission checks current mechanics and authority; semantic request matching and fictional beliefs have different consumers. The synthetic energy reserves, personal limits and immediate feeling operations are not all installed game rules. No benchmark choice executes effects. The [execution report](../../docs/verification/decision-api-benchmark.md) owns measured results and their limitations.

## Spending, records and interruption

### Custom generation experiments

`--model-experiment=/absolute/private/plan.json` selects a finite generation comparison through the same deployment configuration, capability preparation, inference executor and receipt decoder used by production. It supports an existing generation arm, either configured NPC purpose, or an explicit Macrofold deployment. Native decision-only arms are rejected. These tools never create, start or stop hosting, and production does not import experiment metadata.

An example plan is below. Replace the workspace/deployment UUIDs with an existing authorized deployment; the example does not identify a running service. The baseline uses the ordinary configured fast NPC target, including its prices and output allowance. A study output limit can reduce that allowance. Explicit provider model aliases retain their configured pricing.

```json
{
  "schema_version": 1,
  "id": "first_screen",
  "question": "Does this deployment preserve the selected response contract?",
  "cases": ["generate-practical-hare-hunter"],
  "replicates": 1,
  "arms": [
    {
      "id": "baseline",
      "source": { "kind": "purpose", "purpose": "npc_response_fast" }
    },
    {
      "id": "candidate",
      "source": {
        "kind": "deployment",
        "workspace_id": "44444444-4444-4444-8444-444444444444",
        "model_binding": {
          "deployment_id": "11111111-1111-4111-8111-111111111111"
        },
        "structured_output": "auto"
      }
    }
  ],
  "limits": {
    "cap_usd": 1,
    "per_call_usd": 0.25,
    "timeout_ms": 35000,
    "concurrency": 1,
    "max_output_tokens": 1024
  },
  "prior_commitment_usd": 0,
  "hosting_cost": { "basis": "already-funded-shared" }
}
```

An existing arm uses `source: {"kind":"existing","arm":"spark-contributor"}`; a pinned deployment adds `deployment_revision_id` inside `model_binding`. Output policies are `auto`, `json_schema`, `json_object` and explicitly chosen `prompted_json`. The complete local JSON schema remains mandatory in every mode. `auto` is resolved from actual capabilities only during explicit passive preflight or live execution.

```sh
node --env-file-if-exists=.env --import tsx scripts/decision-benchmark/main.ts prepare --model-experiment=/absolute/private/plan.json --out=/absolute/private/comparison
node --env-file-if-exists=.env --import tsx scripts/decision-benchmark/main.ts prepare --model-experiment=/absolute/private/plan.json --out=/absolute/private/comparison --online-preflight=true
node --env-file-if-exists=.env --import tsx scripts/decision-benchmark/main.ts run --model-experiment=/absolute/private/plan.json --out=/absolute/private/comparison --live=true
node --env-file-if-exists=.env --import tsx scripts/decision-benchmark/main.ts report --model-experiment=/absolute/private/plan.json --out=/absolute/private/comparison
```

Ordinary `prepare` and `report` are offline. Passive preflight reads deployment capabilities through the shared production owner; it submits no inference. `run` still requires `--live=true` and existing spending authorization. `--models` conflicts with an experiment plan; duplicate budget, deadline, concurrency and output flags must agree with the plan after checked conversion. Unknown fields, unknown tasks and native decision sources fail locally. Plan files and resolved arm/request metadata share the existing 20 MB private evidence envelope; provably oversized repetitions fail before expansion, without a fixed case/model-count limit or a claimed JavaScript heap bound.

The manifest freezes the resolved baseline, plan/reference fingerprints and explicit replicate identities. Resuming requires the same plan, input contract and baseline settings. Each replicate preserves its original corpus/task IDs and has a distinct arm ID, so grading cannot overwrite a preceding answer. Existing writer locks, admissions, accepted Run identities and uncertain holds prevent redispatch after interruption; authentication/funding stops apply to subsequent repetitions of the same target and funding configuration. These synthetic tasks propose values for evaluation and never publish game actions.

Reports retain selected/admitted/accepted/answered coverage, each replicate's actual revisions/output modes, existing completion latency and explicit failures. First useful permitted speech latency remains unavailable in this harness. Assistant refusal, quiet sanitization and independent character choice require human review; native rejection and committed effects require gameplay evidence. A missing shared hosting bill is `null`, and a supplied `hosting_cost.cost_usd` is an operator-reported study-window amount shown once, separate from request fees. It is not a provider invoice or a per-request hosting charge. Missing token usage retains request reservations unless the exact deployment receipt independently establishes its request fee. A proved Macrofold rejection with no admitted Run releases its request hold; direct provider rejection traces retain existing conservative accounting. A known zero request fee does not mean free hosting. Directory changes grant no new spending allowance.

Only explicitly live execution makes model calls; export, audit, analysis and ordinary report commands are offline. Mike explicitly increased this experiment's aggregate ceiling to **$100 on October 16**, superseding $50. The current manifest validator allows at most $100; an existing $50 manifest keeps its original cap, and a new directory does not grant a new allowance. Revised-run preparation carries every prior charge and uncertain reservation into the next ledger; the ordinary fresh-run default prior amount is not sufficient for continuing this task.

Before POST, each call syncs its admission and credible reservation to an append-only journal. Macrofold receives that exact provider cap. Direct OpenAI reservations use a conservative UTF-8-byte token upper bound, schema/instruction/framing overhead, verified rates including cache writes and applicable long-context premiums, and the hard output-token allowance. `--per-call-usd` defaults to a $0.10 safety ceiling; oversized reservations are rejected. Reservations are not predicted charges.

**Completed calls with complete measured usage and a known conservative usage-based estimate release unused reservation headroom**. Their commitment becomes the greater of that estimate and any provider-reported invoice. Missing/uncertain evidence retains at least the reservation and any larger known charge. Above-cap actual costs stop later admission and remain visible.

`estimatedCostUsd` is a usage-based price estimate. `providerReportedCostUsd` is separate when an actual invoice amount is supplied. Macrofold's `reported_micro_usd` is a frozen-rate retail usage estimate, despite its name; its terminal receipt separately preserves a provider-reported amount when available. Direct OpenAI costs remain usage-based estimates pending billing settlement. Reports preserve precision, missing usage, uncertainty and the prior commitment.

A completed Macrofold POST already supplies invocation usage and billing. The caller awaits its accepted-Run journal entry, then consumes those fields without a separate Run or organization-billing lookup. BYOK estimates require complete token usage and non-provisional billing; missing/provisional accounting retains the reservation, despite BYOK's zero Macrofold model charge. Running or interrupted receipts observe the same accepted Run without another submission.

Accepted Macrofold Run IDs sync before observation. Resume never resubmits a journaled admission, including one with unknown dispatch. A single-writer lock blocks parallel processes. After acquiring it, the runner compares the exact journal bytes used during preparation; if a prior writer finished in between, it refuses execution so stale admissions cannot be repeated. Resume again from the latest journal. Investigate the original process before removing a stale lock. Malformed journals, changed input/prompt bindings, changed funding and edited prior commitments fail closed. Definitive authentication/funding/not-found failures stop subsequent calls for that configuration; already admitted calls remain recorded. No automatic paid retry occurs.

Spending totals and unfinished reservations are reconstructed in one pass through the validated journal. After that, each durably synced event updates the same accounting rules without rescanning completed history. A failed append cannot change the spending index. Full reports still deliberately read the complete selected dataset. Option ordering computes each stable hash once per option, preserving all input and report fingerprints.

Every run containing direct OpenAI configurations shares one request/token admission check across those configurations. Known quota/billing/spending failures and unclassified HTTP 429 stop future direct OpenAI calls, including after resume; they do not stop independent providers. Rate-capacity estimates include the full Responses output allowance as well as the conservative input/framing bound. No failed task is retried.

## Explicit new experiments

For a new paid comparison, freeze a selection of exact model/input pairs and carry all previous charges and uncertain reservations into its explicit task allowance. The reusable runner accepts a `BenchmarkSupplementaryPlan` for this purpose; it does not infer that earlier calls were free. Preserve source fingerprints and every attempt. Keep first usable answers for a completion study; keep whole cohorts separate when deliberately retesting already answered inputs. The fallback tool's `--focus-source` and `--corpus-source` modes provide the supported repeat and known-miss workflows.

If a harness integration defect caused Macrofold to refuse budget admission before model invocation, `recover-budget --live --source=/absolute/original-run --out=/absolute/recovery-run` can complete only proven zero-charge, never-invoked cases with unchanged inputs. It retains authoritative proof, preserves both attempts, binds one recovery directory and shares the source task's remaining budget. It refuses active source runs, uncertain/cancelled/paid requests and different recovery directories. Ordinary `run` never retries them.

## Interpretation limits

This is authored synthetic evidence, not independently labeled player transcripts. Related views and shared history templates are correlated. Twenty supplied trackers are not twenty decisive constraints in every ordinary case; the compound views explicitly require all twenty. Guaranteed plan costs/outcomes are task facts, not predictions of game physics. The suite does not establish production recall quality, natural long-term character conduct, medical/psychological truth, native proposal admission, sustained population capacity or free-text quality. Byte sizes do not establish tokenizer fit. Provider capacity failures remain results and evidence is never silently truncated.

Latency measures each configured integration path, including Macrofold overhead and awaited acceptance journaling for its arms; direct OpenAI and intermediary paths are not identical infrastructure. Macrofold's `providerLatencyMs` measures its upstream adapter interval, including networking and response normalization, from `inference.timings_ms.provider`. Its admission wait is separately named `intermediaryQueueLatencyMs`; Run start-to-completion duration is `intermediaryRunLatencyMs` when recovery supplies those timestamps. Normal terminal POST receipts do not supply Run duration. Missing timings remain absent; none of these measurements isolates model computation. Cache writes/hits, warm-up, request order, output budgets and reasoning token counts affect costs and latency. One pass cannot establish repeatability or deployment readiness.

## Decision escalation qualification

This is a separate experiment for the implemented one-attempt fallback, not a rerun or regrading of the full 4,000-question comparison. It uses the production trigger resolver, coordinator, prompt, schema, decoder and scoped answer consumer. Run against an explicit loopback **disposable** PostgreSQL administrative URL; output must be an absolute private path outside the repository. Never use an application database or save.

```sh
OPENLEGEND_TEST_DATABASE_URL=postgresql://localhost/postgres pnpm exec tsx scripts/decision-benchmark/escalation.ts --out=/tmp/openlegend-fallback-fixture
OPENLEGEND_TEST_DATABASE_URL=postgresql://localhost/postgres pnpm exec tsx scripts/decision-benchmark/escalation-load.ts --out=/tmp/openlegend-fallback-load
```

The first command makes zero external calls. Its controlled answers test orchestration and report arithmetic, not model performance. It freezes six new authored episode families with 48 related person/order/density views, 20 hypothetical trackers and up to 539 memories. References remain grading-only in live execution. Both primary and higher routes receive the same native-permitted alternatives; known illegal choices are filtered before either model. Actual stock changing after an offer is exercised separately in the native server tests, not simulated as an artificial quality gain. All views of one family remain together in the paired bootstrap. These are authored scenarios, not installed world laws or independently validated gameplay transcripts.

The second command measures no-network shared scheduling, actual cold/warm native preparation, **100/1,000 requested opportunities**, normal/concentrated bursts, configured 1×/8× speed and pending/unsent-selection SQL plans with 20,000 retained completed receipts. It renews fixture presence independently, advances the actual world clock continuously with one outstanding tick, bounds primary publication to one, and records explicit busy refusals without replay. Requested versus admitted opportunities, simulation progress and elapsed wall time remain separate measurements. Per-case timeout, pause, no progress, storage failure or busy failure makes the run unsuccessful; the observations are retained for diagnosis.

`--counts=100` selects the smaller workload; `--only=100:normal:1:apply` selects exact cases; `--model-delay-ms=250` controls artificial provider delay. `--max-case-ms=30000` bounds each measured case to 30 seconds (default 120 seconds, range 1–600 seconds). The watchdog pauses the disposable world rather than waiting indefinitely for a slow clock to catch up; do not present its truncated work as completed. `--diagnose` prints preparation/drain milestones. This service/persistence workload excludes HTTP, SSE and browser rendering. Artificial delay and bounded capacity do not establish live provider speed or supported population.

Actual inference requires `--live`, available owner-authorized credentials and exact direct `gpt-6-luna` prices through the ordinary price catalogue. A one-call direct route check adds `--route-probe` (the primary is a fixture, the higher call is real). Live execution requires an explicit `--prior-commitment-usd` containing every earlier charge and outstanding commitment for this implementation task. `--cap-usd` is a total task ceiling of at most **$10**, not a fresh allowance per directory. Available account admission is reduced by the prior amount. Consult current accounting before choosing a prior value. The older benchmark's $100 authorization does not automatically expand this implementation qualifier.

The script reads the process environment. To load the repository's `.env` explicitly, invoke `node --env-file-if-exists=.env --import tsx scripts/decision-benchmark/escalation.ts` with the same flags. Direct inference uses the current immediate-execution API without `Prefer: respond-async`; HTTP 202 only observes an already admitted invocation. The one-second usefulness deadline never cancels the primary's separately bounded receipt observation. [Full-policy results](../../docs/verification/decision-escalation.md#live-policy-comparison) and [current spending](../../docs/verification/decision-escalation.md#spending-and-evidence) record measured outcomes and outstanding charges.

Fresh directories receive an exclusive lock, frozen episode/policy/price manifest, source commit and patch, synced append-only journal and durable financial records. There is no automatic replay/resume command for paid work. Retain a live accounting database when receipt/price is uncertain; investigate the original request and settle it through its owning receipt path. Never remove a lock or start another directory to bypass an unknown execution, exhausted credit, held reservation or the aggregate cap.

Reports show correct/answered, summed earned/possible points and full-workload answer coverage separately. They retain original and final substantive proposals even when rejected/late, delivery before expiry, triggered/admitted/completed counts, corrections/regressions/recovered answers, and whole-root cost distributions only for fully observed costs. Missing prices remain conservative commitments. Human tables use two decimals (nonzero amounts below one cent show `<$0.01`); JSON/journals retain exact precision. The bootstrap uses 5,000 paired whole-episode resamples with a frozen seed. The choice-only experiment cannot qualify response/appraisal quality or human character consistency. It never enables production fallback by itself; [DE05](../../docs/maintainers/cognition-redesign.md#de05--actual-escalation-benchmark-and-controlled-activation) and [actual evidence](../../docs/verification/decision-escalation.md) own promotion and gaps.
