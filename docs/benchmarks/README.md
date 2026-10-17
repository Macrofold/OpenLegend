# OpenLegend benchmarks

Start with the full comparison for general model quality, and the fallback comparison for difficult decisions that the primary model missed. Each report owns its measurements.

| Report                                                                                     | What it answers                                                                                                                                       |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Full 4,000-question comparison](../verification/decision-api-benchmark.md)                | Accuracy, partial-credit points, factual mistakes, coverage, latency and cost for seven configurations, plus eighty separate structured-output tasks. |
| [Fallback model comparison](decision-fallback-models.md)                                   | Which models answer all 267 recorded Jev misses best; also includes the supporting 48-scenario comparison and exact-input repeat study.               |
| [Actual runtime policy](../verification/decision-escalation.md#live-policy-comparison)     | Whether the running policy chooses useful fallback calls. Its 48-view live sample needed none, so it demonstrates no added quality benefit.           |
| [Slow-answer gameplay](../verification/decision-escalation.md#live-gameplay-with-luna-low) | Whether characters and the world move while a real Luna Low answer waits, and whether the answer applies once.                                        |
| [Corpus and grading audit](../verification/decision-benchmark-audit.md)                    | Current context complexity, remaining shortcuts, subjective references and hypothetical-world boundaries.                                             |
| [Load observations](../verification/decision-escalation.md#load-and-storage-observations)  | Bounded scheduling and database behavior, including the dense workloads that did not meet their requested simulation speed.                           |

Accuracy means correct answers divided by answers received. Points are summed earned points divided by available points for those answers. Coverage is separate so missing difficult inputs remain visible. A factual contradiction and a subjective emotional disagreement are different checks.

The inputs and references are authored synthetic material, with disclosed reference changes. They do not establish independent psychological truth, natural long-term gameplay or supported population capacity. Exact inputs, attempts, source fingerprints and full-precision accounting remain in the private evidence locations named by each report; credentials and raw transcripts are not committed.

[Harness instructions](../../scripts/decision-benchmark/README.md) · [Completed benchmark scope](../projects/completed/decision-api-benchmark.md) · [Runtime fallback specification](../projects/decision-escalation-feature-spec.md) · [Verification index](../verification.md)
