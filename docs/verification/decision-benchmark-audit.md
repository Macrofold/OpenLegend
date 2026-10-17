# Decision benchmark: corpus and measurement audit

Audited **2026-10-17** from the executable current corpus. **4,000 questions have answer keys, with no scoring exclusions.** The suite tests many difficult supplied-context decisions, but its authored references and repeated scenario variants limit what high scores prove. [Measured model results](decision-api-benchmark.md) and [fallback comparisons](../benchmarks/decision-fallback-models.md) are separate from this no-provider audit.

## Current workload

| Property                                                                           |                                                        Measured value |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------: |
| Situations / questions                                                             |                                                           724 / 4,000 |
| Multiple choice / yes-or-probability / ordered rating                              |                                                     2,628 / 728 / 644 |
| Separate structured-generation tasks                                               |                                                                    80 |
| Group identities                                                                   | 192: 100 introductory scenes, 80 complex episodes, 12 design controls |
| Current-contract / selected-design / hypothetical-world scenes                     |                                                         70 / 12 / 642 |
| Remembered entries per scene, median / maximum                                     |                                                             256 / 539 |
| Scenes with twenty supplied meters or personal limits                              |                                                                   612 |
| Questions selecting a structured proposal                                          |                                                                 1,824 |
| Single accepted interpretation / multiple valid / explicitly insufficient evidence |                                                    2,314 / 1,670 / 16 |
| Model-facing state, median / maximum UTF-8 bytes                                   |                                                      82,930 / 234,276 |
| Largest complete input, UTF-8 bytes                                                |                                                               243,753 |
| Largest offered choice set                                                         |                                                                    44 |

“Insufficient evidence” is an authored answer such as declining to infer a private fact; it does not mean the question lacks a grade. Bytes are not tokens. Twenty supplied trackers are not twenty decisive constraints in every ordinary question. Repeated views do not become independent characters or independent samples.

The eighty complex episodes each have seven controlled views: 32 memories, 128, two opposite memory orders at 256, a separate option-order variant, 512, and one consequential changed fact. Forty mood views reuse twenty episodes. Twelve difficult planning views combine hundreds of memories, twenty personal limits and thirty-two schedules. The engine supplies current quantities and reservations; the model chooses how to use them. It never has to reconstruct authoritative stock from memory. Additional joy controls exercise a selected design, clearly distinguished from installed gameplay.

## What makes the cases difficult

The supplied facts include functional injuries, equipment, finite commitments, invitation boundaries, differently embodied characters, conflicting loyalties, artistic setbacks, attributed claims, corrections and explicitly hypothetical world laws. An attempted action is distinct from a completed outcome. Plan costs and durations are supplied facts; the model must respect them while choosing among alternatives.

The planning views require checking each schedule against twenty remembered personal limits, including later changes, current supplies and the desired outcome. Other long histories usually have fewer decisive facts among many distractions. Their templates recur across episodes. History length alone therefore overstates reasoning complexity; report the task's dependencies as well as its byte count.

Mood pairs change fullness, reported sadness and irritability together while preserving the encounter, relationship and plan constraints. Overlapping emotional bands allow restraint. This is a combined mood comparison, not evidence that hunger alone causes anger. Intensity cannot be compared directly when the selected feeling changes from frustration to sadness or relief.

## Grading and reference quality

Every answered question receives ordinary reference grading and partial-credit points. Equally acceptable options tie at full credit. Ordered ratings use the nearest offered category, with exact halves rounded upward and finite values bounded to the scale. Probabilities remain continuous. The policy is fixed before grading; it never chooses whichever interpretation makes an answer pass.

The additional factual-error check applies to **2,728 questions** with sufficiently explicit supplied constraints. It can detect an impermissible target, impossible schedule or contradiction. It does not claim that a preferred emotional tone is the only reasonable one. Its denominator includes only returned answers it actually checks; other answered questions still receive ordinary accuracy and points. These are benchmark classifications, not measured engine refusals or harm.

**Twenty-one subjective references were broadened after initial model observations**, then applied consistently to every model. Their source-based review accepted a firm boundary for Talin's private family story, a firm acknowledgment for Edda's carving credit, and moderate frustration for Ashen's applause combined with pressure to jump during recovery. Each spans seven related views; the corresponding generation references agree. This is disclosed post-run interpretation, not blind independent validation. Ambiguous questions without defensible offered answers are absent from the current corpus.

The point and factual-error policies were also developed with earlier aggregate results and examples already known, then frozen before their detailed regrades. They must not be described as independent holdouts. Opinion weights measure closeness to authored references, not observed gameplay utility or psychological truth.

## Residual shortcuts and correlated evidence

A no-context diagnostic chooses the longest alternative, answers zero to yes-or-probability questions, and zero to ratings. It passes **1,452 / 4,000 (36.30%)**. Longest-alternative selection alone passes **1,042 / 2,628 (39.65%)**; always-false passes **390 / 728 (53.57%)**. This exposes remaining writing and label imbalance. These are deterministic shortcuts, not model measurements.

Options receive opaque handles, and semantic plan identities and display order vary by episode. The memory-order pair keeps its choice bindings fixed; the separate option-order view changes only those bindings. Ordered rating anchors retain their semantic order. All views of one episode stay in one partition: 38 development, 19 challenge and 23 holdout episode groups. These public authored partitions are not secret or independently validated test data.

Broad emotional bands intentionally accept multiple plausible reactions. A high score alone does not demonstrate that a model used the character's past. Repeated views and shared history patterns must remain grouped in uncertainty estimates; selecting known failures tests repair difficulty, not general-population accuracy.

## Structured outputs and world boundaries

Native decisions can select a complete offered plan, feeling proposal or tone. The selected proposal can contain a permitted target, absolute intensity and duration; this is selection among supplied structures. Eighty separate tasks require an ordinary LLM to generate JSON for a plan, reaction, expression and optional speech or thought. Shape, plan eligibility, feeling legality, subjective agreement and human prose assessment are distinct.

The corpus runs outside game startup. Hypothetical physiology, institutions and alternate worlds are supplied test data, not rules added to the engine. No benchmark proposal executes effects. The actual runtime owns current stock, permissions, installed decay and action admission; a model can judge only the permitted evidence supplied to it. The corpus does not validate real memory retrieval merely by supplying a large archive.

## Reproduction and tooling limits

```sh
pnpm exec tsx scripts/decision-benchmark/main.ts audit
pnpm exec tsx scripts/decision-benchmark/main.ts validate
```

The current corpus is `openlegend-decisions-4000-2026-10-16`, SHA-256 `01a9160827f6e649aac11353fb1621df0757a720260f18a16a474343683dd21e`. Each live manifest separately freezes complete inputs, settings, prompts and grading identities. A changed input requires a fresh prediction; unchanged first usable answers may be reused only with authenticated provenance. Raw financial and attempt records remain private even when a published report is superseded.

The runner reconstructs spending once from the durable journal, then updates that index after each synced event. It does not rescan completed calls before every admission. Exports write one scene or task at a time with backpressure, private permissions and exclusive file creation. All corpus views are still built at import before filtering, so retained memory grows with the entire authored collection. Before substantially enlarging it, [DB01](../maintainers/cognition-redesign.md#db01--synthetic-decision-api-comparison) requires reevaluating selected-view construction and the host memory target. This is offline tooling, not a gameplay hot path.

## Limits on conclusions

A stronger game evaluation still needs independent human review of emotional references and prose, new episode families, actual selected-memory assembly, corrections or forgotten private evidence during asynchronous work, native proposal admission and complete episodes where meals, company, refusal or success influence later conduct. Current work supplies controlled examples of relevant context, not autonomous lives or sustained population qualification.

The current [full comparison](decision-api-benchmark.md), [fallback models](../benchmarks/decision-fallback-models.md) and [native/gameplay verification](decision-escalation.md) record the evidence actually obtained. Broader requirements remain in their gameplay and cognition trackers; they are not uncompleted promises of this bounded corpus. This audit made no provider calls: additional Jev cost **$0**, cumulative reported Jev estimate **$1.231822**, with **$0.042088** in separate uncertain reservations.
