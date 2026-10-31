# Situation-aware cognition context: implementation qualification

## Scope and revision

October 28–29, 2026 (UTC). Core implementation checkpoint `7030c67d5` in `Macrofold/OpenLegend`, `codex/cognition-lab`, follows `72f9e58237a4528fd39f3e46759c978391038045` with `origin/main` integrated at `041ae122678cc808c20047e0907a70b804120f4c`. The [SC tracker](../maintainers/cognition-context.md) owns completion; the [technical design](../technical/situation-aware-cognition-context.md) owns contracts. Later review fixes and final checks are identified below.

This qualifies construction and admission through current consumers. It does not establish reliable personality, universal recall, hallucination-free prose, human enjoyment, public speech streaming or optional SC12 refinements. Runtime defaults, relevance thresholds and financial limits remain unchanged. All native/fixture checks use disposable PostgreSQL worlds and zero provider budget.

## Sources and privacy

- Native speech and implicit follow-up retrieve an authored year-old account among 400 intervening memories, through both ready-vector and unavailable-index/direct paths. This tests source availability and attribution, not a year of simulated experience or natural model influence.
- Current exchange cues reach discovery and attention. Each complete cue ranks separately in lexical search; best per-query ordinal prevents unrelated recent vocabulary drowning a more specific cue. The existing specific-connection attention wording and 0.5 threshold remain unchanged.
- Trigger, conversation, recall and appraisal roles share one complete `character.experience` entry with structured meaning and readable account. Equal words on separate occasions remain distinct sources. Appraisal indexes bind after selection; correction/forgetting invalidate their exact original sources.
- Optional discovery/finalization exhaustion retains the complete current baseline and truthful unavailable coverage. Required-source loss refuses dependent generation. Native checks cover private-source exclusion, forgotten-source guards and graph closure; synthetic selector checks also cover shared support, unavailable dependencies, cycles, long chains, uncertain size bounds and nonfitting optional roots.
- A native stored ID equal to a four-character model handle cannot redirect prepared evidence. Exact heard `(ID:...)` text remains literal. Adding a hidden object with a guessed stored-annotation ID leaves the complete model prompt unchanged; unknown annotations no longer disclose global membership. Known remembered identities still resolve. Recognizing a previously unknown speaker during an asynchronous wait invalidates a preparation whose evidence handle would change; the unchanged-reference control remains usable.

Source inclusion alone proves neither use nor lack of use. A character can keep an association private or remain silent. The actual broad-history profile below deliberately uses neutral cues and reports unexamined sources rather than claiming successful recall of a benchmark target.

## Hierarchical choices

Player and NPC consumers share installed forms, scoped entity/definition/literal role readers and dependency-aware parameter frontiers. A native selected binding retains exact terms, mode, method/output ownership and current preconditions. Tests cover no-mode forms, learned multi-output methods, dependent domains, known destinations, stale references and independent choices. Browser interaction results are recorded with final checks below.

A 20-iteration source-stage comparison used the old eager producer from `72f9e58237a4528fd39f3e46759c978391038045` with current native readers. Counts include actual actor observation; this excludes database/provider work, exact geometry previews and complete NPC latency.

| Recipients / quarry / destinations | Old concrete choices | New concrete choices | Shared role rows |
| ---------------------------------- | -------------------: | -------------------: | ---------------: |
| 3 / 8 / 26                         |                  708 |                    6 |               72 |
| 5 / 10 / 28                        |                1,550 |                   10 |               86 |
| 9 / 14 / 32                        |                4,338 |                   18 |              114 |
| 17 / 22 / 39                       |               15,283 |                   34 |              168 |

At the largest sample, mean source-stage CPU was 46.36 → 1.44 ms and wall time 59.27 → 1.03 ms. Structural removal of argument products is established; contended-host timing is not a whole-decision speedup or service SLA. Raw local evidence: `.data/cognition-hierarchy-profile/summary.json`.

The actual operator catalogue was separately measured before and after its existing page/search narrowing. Three repetitions produced identical counters: 717 catalogue rows required 722 full-view kernel previews, while an eight-row page required eight and exact-ID search one. With 2,033 rows the corresponding counts were 1,968, eight and one. The selected native binding and availability matched the full view, and the world remained unchanged. These are current catalogue counts, excluding NPC binding/commit and latency; they do not measure the old producer. Native support resolution yielded role populations of 3/8/26 and 17/22/40, distinct from the source-only comparison above. Raw evidence: `.data/cognition-hierarchy-profile/catalogue-previews.json`.

## Preparation and storage cost

Native observation with 10,006 permitted inventory rows copies 16 selected rows, preserving equipped/bound items and full permitted supply quantities. Metadata enumeration and inspection ordering still grow with the actor's inventory. The refreshed isolated observation profile measured median 28.94 → 25.76 ms for the large own inventory, and 26.82 → 24.83 ms with 10,000 unrelated holdings; these are contended local observations, not a general latency guarantee.

Invention material discovery uses the same eligibility with one representative stock row per owned definition and no memory projection. Its catalogue equals the full observer's catalogue for varied definitions, generated owned material and unequal stack quantities. A native parity check reduces 10,009 copied rows to seven for repeated stock or fourteen for varied definitions; 10,000 other-actor rows leave the catalogue digest unchanged. Quantity observations remain with their own owners. Generation-enabled routing captures at most three private invention-history results before selection through its existing indexed query; this adds no inference call. Raw parity evidence: `.data/cognition-context-implementation-20261028/invention-material-catalogue-check.json`.

The actual `prepareDecision` caller was measured cold and across four warm repetitions, including final source validation. Attention was a deterministic zero-cost fixture, with no provider call; setup was excluded. Source hashes and function digest are retained in the raw record. These measurements precede constant captured-facing metadata, the annotation-only fix and the final evidence-reference freshness guard.

| Workload                         | Warm median wall / CPU | Final prompt | Candidates / references / units | Experience sources |
| -------------------------------- | ---------------------- | -----------: | ------------------------------- | -----------------: |
| Small local scene                | 74.0 / 35.9 ms         |     34,022 B | 44 / 34 / 110                   |                  0 |
| 401 authored historical accounts | 114.5 / 71.4 ms        |     95,246 B | 344 / 34 / 537                  |                213 |
| 10,006 own inventory rows        | 139.4 / 103.7 ms       |     37,098 B | 54 / 44 / 130                   |                  0 |
| 10,000 unrelated holdings        | 38.6 / 24.1 ms         |     34,022 B | 44 / 34 / 110                   |                  0 |

The unchanged local scene with unrelated holdings has identical source IDs/counts and prompt bytes, not evidence that adding objects makes decisions faster. The historical sample reports 87 unexamined sources; fixture attention accepted every examined candidate and does not establish relevance quality. Host contention produced wall outliers up to 346 ms. Heap deltas include allocation/GC and do not establish retained-memory bounds. Raw records: `.data/cognition-context-implementation-20261028/prepare-decision-profile.json`, `prepare-decision-profile-final-confirmation.json`, and `decision-observation-profile-integrated.json`.

A final confirmation on sources following `f642918ac4df34b19429afdd5f7e890be8625f6b`, including the diagnostic-only token-estimate exclusion correction, ran on October 29, 2026, 01:29 UTC. It measured the actual caller and selected-source validation, with setup excluded and no provider calls. Each fresh disposable cohort had one first read and two warm reads. Both returned 44 candidates, 34 references, 111 units, 108 required roots, 72 dependency edges and the identical 34,103-byte prompt across all six reads. Every required/dependency closure validated; these quiet specimens contained no historical experience sources or attention requests. Exact source hashes are retained and remained unchanged throughout.

| Current workload              | Wall ms: first / warm / warm | CPU ms: first / warm / warm | Heap endpoints, MiB | RSS endpoints, MiB |
| ----------------------------- | ---------------------------- | --------------------------- | ------------------: | -----------------: |
| Small local scene             | 150.6 / 37.9 / 37.7          | 73.8 / 38.0 / 26.7          |           82.5–86.3 |        299.3–308.7 |
| 10,000 other-actor stock rows | 124.9 / 33.8 / 38.1          | 38.0 / 24.4 / 30.9          |         189.1–227.2 |        416.4–418.2 |

Heap/RSS values are actual process endpoints before/after each read, including the existing world and allocation/GC effects, not peaks or retained-memory bounds. The separate logical retained-byte counter was 20,002 in both cohorts. Host load remained elevated; these samples establish stable scoped input/work counts, not a latency SLA or full-director measurement. One background memory-search task reported `busy` before transaction entry; selected-source coverage remained complete with zero eligible histories. Raw evidence: `.data/cognition-context-implementation-20261028/prepare-decision-profile-final-process.json` and its `.stdout.txt` companion.

Lexical query plans were measured separately for 400/4,000 accounts and 1/2/8/32 complete cues. The multi-cue query reuses eligible metadata rather than repeatedly merge-scanning it; local planner settings are restored in the same transaction. At 4,000 accounts, two warm samples measured 81–102 ms for two cues, 252–257 ms for eight, and 1.45–1.85 s for 32, versus the previous 32-cue query's five-second timeout. Those plans used primary-key paths, not the available GIN index. Matching work still grows with cues × matching metadata; only the final ≤300 bodies are hydrated. Cold lexical readiness remains asynchronous and can exceed the existing wait; a timeout is unavailable evidence, not absence. Raw plans: `.data/cognition-sparse-20261028/lexical-profile/`.

## Schemas and provider requests

Current inline sparse schemas cover exact nested action, installed-family, goal, plan and appraisal alternatives. Direct adapter and Macrofold fixtures exercise actual serialization, parsing, accounting, replay, failure and native publication boundaries. Reflection and configured reconsideration share current payloads; no old model-format parser, paid repair or external schema resolver is retained.

Strict schema correctness increased input size: small response schema 7,771 → 10,497 bytes; four installed forms 9,682 → 13,022; reflection 2,381 → 3,362. Output omits inactive payloads. No total token/cost saving follows from these local schema sizes; `$ref` remains disabled and optional.

The live attempt’s generated and adapter-submitted schemas are identical, with zero invalid `"type": null` declarations. The old supplied export’s exact deployment/origin remains unknown; its anomaly is not reproduced in this current path. Local record: `.data/cognition-context-implementation-20261028/schema-artifact-confirmation.json`. No validator was weakened to accept that historical export.

One actual direct-provider generation used the public director chat submission, deterministic fixture routing/attention, the priced configured default `gpt-5.6-luna`, and the real adapter/native speech path. Task-process settings selected that same default for the fast route and disabled stopped custom targets, Macrofold, embeddings, reflection and escalation. No global configuration changed. Exactly one external request was sent, with no retry.

- Actual transport: 67,474 bytes; instructions 4,467; context 39,110; schema 20,704; output allowance 1,024 tokens.
- Provider HTTP 200/value; 16,270 input tokens, 155 output, including 69 reasoning; reported cache-write input 16,267. Latency 4,481 ms. One native talk operation committed; no mechanical action.
- Configured-rate estimate **$0.00425335**; ledger rounded **$0.004254**, no outstanding reservation or uncertain completion. Additional/cumulative Jev cost **$0**. All task-owned resources closed.

The reply generalized the character's own lack of food to “we have no food.” This smoke proves schema/transport/native publication, not that group inventory was verified or prose is hallucination-free. The game still validates mechanical effects independently. Private exact evidence: `.data/cognition-context-implementation-20261028/director-provider-smoke-live-d9722957-cbb9-4f91-9873-e9221e32f5d6.json`.

No fresh live Macrofold Worker, Kev or Huihui qualification ran. Their adapter fixtures are distinct evidence; stopped capacity and previously recorded context-window constraints remain unchanged.

Complete-input fitting also covers native reconsideration and ordinary generation. A native case retains 20 meters, three required memories, 539 memory candidates and every required choice. Native choice-only input omits unusable appraisal-mutation controls while retaining current feelings and their freshness checks. An ordinary 401-memory fixture previously selected 200 sources and refused before generation when late support exceeded the allowance; the corrected actual-consumer fit retains 181 and admits 99,409 input bytes (4,467 instructions + 94,942 context), with a 20,961-byte schema. The bounded-decision route also passes at 99,410 bytes. The zero-memory control stays at 43,485 input bytes and a 20,704-byte schema. Both use the same existing judgment calls; the richer case now reaches one fixture generation. These are admission/source checks, with no external model or behavioral-quality result. Source-digested captures: `.data/cognition-context-implementation-20261028/ordinary-admission/{final-summary,bounded-summary}.json`.

## Independent operations and lifecycle

A native attack case holds judgment while actual movement changes the selected physical plan. The physical component refuses as stale while independently selected valid speech still publishes. Forgetting the initiating source or incapacitating the speaker prevents voice generation/publication. This is fixture-controlled component behavior, not autonomous emotional quality.

Generated actor-relative movement retains server-captured position/support/facing/physical life. A move after that frame changes refuses only its affected component; independent speech and existing work survive. Immediate typed/native movement keeps its current-frame semantics. Native tests cover same-work movement, changed heading, missing capture and absolute-coordinate control.

Existing timeline, cancellation, receipt, current-format restore and permission owners remain authoritative. Compiler/manifest state is derived and creates no saved parallel mind, world pause, native cost or paid retry.

Exact old-source validity and a newer conversational turn are separate guards. Newly heard speech addressed to the deciding actor supersedes that actor's older reconsideration before publication and inside native admission; unrelated appended history remains valid. Six focused lifecycle cases retain this distinction. The HTTP background-play failure was numerical equality (`29.999999999999996` versus `30`), not a departure fault: all thirteen HTTP cases pass with a tight floating comparison and unchanged exact pause/departure checks.

## Final checks

- The final unfiltered native/fixture suite passed **124 files and 1,387 tests** in **920.99 seconds**. It used disposable PostgreSQL databases and `AI_BUDGET_USD=0`, with `pnpm exec vitest run --maxWorkers=2 --testTimeout=60000`. This run-only parallelism leaves the repository's serial default unchanged; suite duration is not a service-latency measurement.
- The preceding serial run passed 1,386 tests and failed E01's immediate/deferred assertion. Its two logical clocks were frozen while its real one-second timer continued running. The corrected fast-path specimen controls that timer too and retains its original immediate-action assertion; production deadlines are unchanged. The isolated corrected case and the final full run pass.
- The actual Chrome journey at 1,024 × 720 passed in 58.6 seconds: dependent method/output selection, an exact count of three, native proposal terms, transitive dependent-field resets, preservation of independent drafts, agreement revision and modal focus. Root and reviewer inspected both captured images. Artwork was deliberately unavailable in this fixture; this is input/layout qualification, not visual-asset acceptance. Raw captures remain outside Git under `/tmp/openlegend-cognition-browser-results/`.
- Native Main initialization and isolated Lab startup are qualified separately. The HTTP fixture now initializes its actual starting world before requests; the renderer-free Lab no longer inherits a game presentation release into its empty catalogue. Unknown assets still fail validation. An earlier Lab receipt check timed out in its grouped run; the focused case and final unfiltered suite pass without increasing its explicit timeout.
- The complete affected diff and final fixes were reviewed for ownership, privacy, lifecycle, required-source preservation and unnecessary work. TypeScript, production build, configuration, network, guidance, affected-file formatting and documentation target/anchor checks pass. Completed [SC01–SC11](../maintainers/completed/2026/cognition-context.md) preserve the delivered scope; optional SC12 and broader character/player qualification remain separate.

## Final reconciliation

On **2026-10-29 02:31 UTC**, the branch was rebased from qualified tip `fc5d75ede99d8ae39f862ae47a4a353999630473` onto refreshed local `main` and `origin/main` at `5e490f9a4b766785b50a6eeaa2f255f133a9f025` in `https://github.com/Macrofold/OpenLegend.git`. The resulting checkpoint is `59889d477`; core runtime checkpoint `f642918ac` maps to `c86e5fa87`. The sole conflict combined the remote picker's existing interaction control with main's optional trigger artwork. Neither behavior was removed.

The 19-commit patch comparison shows only that two-line combination. Server, domain, AI, protocol and test files are byte-identical to the qualified tip, so the full suite, browser and native profiles retain their recorded scope. Post-reconciliation TypeScript, production build, guidance, picker formatting, documentation target/anchor and whitespace checks pass. No additional provider call, browser qualification, hosting operation, push or merge ran during reconciliation. The main checkout was not changed.
