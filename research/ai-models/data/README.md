# Structured inventory and evidence

These files contain the complete sourced model records represented in the human-readable tables. They are a research snapshot, not a runnable deployment manifest or a list of models approved for production.

| File                                               | Shape and purpose                                                                                                                                                                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [character-models.json](character-models.json)     | Array of character/roleplay records. Stable `RP` identifiers connect the three detailed tables; includes exact model IDs, behavioral evidence grades, sentiment provenance, published examples and deployment/cost/license notes. |
| [character-metadata.json](character-metadata.json) | Scope, evidence-grade definitions, priority meaning, targeted review date and six older reference models.                                                                                                                         |
| [character-sources.json](character-sources.json)   | Character-source IDs, canonical URLs, retrieval dates, source type, supported scope and records using each source.                                                                                                                |
| [decision-models.json](decision-models.json)       | Metadata plus `models` array. Includes dedicated decisions, ordinary generators, exact API/artifact identities, version status, use cases, example evidence, metering and limitations.                                            |
| [decision-sources.json](decision-sources.json)     | Decision-source IDs, titles, dates, source types and supported claims.                                                                                                                                                            |
| [voice-models.json](voice-models.json)             | Array of speech-model/service records. Includes TTS/recognition/conversion/conversation roles, exact IDs, streaming/expression properties, deployment, commercial terms, content-policy evidence and sample-inspection status.    |
| [voice-sources.json](voice-sources.json)           | Voice-source IDs, canonical URLs, inspection dates, source type and supported claims.                                                                                                                                             |
| [catalogue.json](catalogue.json)                   | A uniform compact index across all three inventories, with the owning detail file and record ID. The domain records retain the complete facts.                                                                                    |
| [shared-sources.json](shared-sources.json)         | Additional primary sources used by the overview and deployment/cost interpretation.                                                                                                                                               |

## Interpretation

Research priority means a useful later comparison, not a measured rank. The character and voice tables use `P1`/`P2`/watchlist-style labels; decision records use `high`/`medium`/`baseline`/`watchlist`. Preserve any license/policy qualifier. The uniform catalogue retains the original priority rather than implying that the two scales were numerically calibrated.

Release dates, model-file updates, service snapshots, article publication dates, crawl dates and retrieval dates are different. Records describe which one is known. The initial inspection date is October 23; October 24 review fields identify narrower checks and additions, not a claim that every source was fully refreshed again.

Specs and prices use model cards, official documentation, artifact licenses and provider listings. Community evidence identifies original discussions or firsthand use where found; exact-version uncertainty and publisher-selected testimonials are marked. Some source ledgers include discovery-only or supporting family evidence. Their presence does not turn a vendor claim into independent validation.

All model examples come from attributed public demonstrations, evaluation artifacts, documentation or brief excerpts. A usage snippet is labeled as such. Linked audio was not auditioned or synthesized. A missing published output is not replaced by a fictional example attributed to the model.

No account credentials, model weights, generated evaluation logs, benchmark results or voice assets are included. All models remain untested by this research. Reuse the detailed records and sources when preparing an explicitly authorized comparison; do not infer game integration support from the existence of a model card or an autogenerated hosting snippet.
