# LT-M — Large-scale memory and storage

[Deferred backlog](README.md) · **G3/G4/LATER; promote only on measured corpus/maintenance demand.** Parents: D2/D6, CR, SL. SC06/SC08/SC11 and database-first D1/D2 recall remain near-term work. **Massive-scale research for every item:** [planetary memory](../../../archive/02-research/massive-scale/later/planetary-memory.md), [memory retrieval](../../../archive/02-research/massive-scale/domains/memory-retrieval.md), [capacity arithmetic](../../../archive/02-research/massive-scale/capacity-model.md) and architectural options 3–4. Audit: SCA09/SCA18/SCA35–SCA39/SCA52.

<a id="lt-m01"></a>
- [ ] **LT-M01 — Corpus and access distribution model.** Trigger: storage/search planning for a measured larger deployment. Extend PF evidence with ingestion, actor-corpus skew, private/shared selectivity, update/delete rates, hot/cold access and amplification from indexes/WAL/replicas/backfills. **Exit:** distinguish global volume from per-query eligible corpus and maintenance bandwidth; forecast explicit scenarios without claiming measured future capacity.

<a id="lt-m02"></a>
- [ ] **LT-M02 — Bounded physical partition routing.** Trigger: current placement cannot meet LT-M01 requirements. Depends on canonical D2 records and SC11. Group many actors/world regions into manageable partitions with stable logical IDs, scoped routing and online move/split. **Exit:** growing unrelated global population does not expand an actor's query corpus; no table/index per NPC or unauthorized cross-partition search; move failures preserve source eligibility.

<a id="lt-m03"></a>
- [ ] **LT-M03 — Exact versus filtered ANN evaluation.** Trigger: a genuinely large eligible corpus misses the retrieval objective. Compare exact scoped search with suitable HNSW/SSD/quantized/GPU candidates under live ingest and selective permissions. **Exit:** report recall@k against an exact authorized oracle, mandatory-evidence retrieval, p99/cold latency, RAM/storage/build cost and sparse-filter failure behavior. Do not adopt ANN for small private corpora merely because total volume is large.

<a id="lt-m04"></a>
- [ ] **LT-M04 — Shared-source payload representation.** Trigger: duplicated common event/utterance payloads dominate ingest or storage. Depends on EPR/D2 lineage. Evaluate one source with individual acquisition/detail records and sharing only identical permitted fragments. **Exit:** different intelligibility, identity recognition and independent forgetting remain distinct; source fetches cannot reveal undisclosed text; compare write/read/deletion amplification before selecting a layout.

<a id="lt-m05"></a>
- [ ] **LT-M05 — Mutable search and model-index migration.** Trigger: chosen large index or an approved embedding upgrade. Depends on LT-M03 and SC06/SC11. Support revision-safe incremental updates/deletes, durable build watermarks, temporary dual models/indexes and throttled backfill. **Exit:** live ingest continues within its budget; correction during build cannot resurrect stale rows; storage and completion time of rebuilds are measured and rollback is coherent. Missing vectors remain visible coverage gaps.

<a id="lt-m06"></a>
- [ ] **LT-M06 — Historical tiering and lifecycle operations.** Trigger: selected D59 retention exceeds economical hot storage. Separate immutable source archives, eligible recall, creator/operator history and rebuildable indexes; implement bounded scoped readers and explicit expiry/compaction. **Exit:** important retained sources and commitments survive, routine expiry matches selected policy, and a physical archive grants no character access to forgotten/unperceived material. Measure retrieval and maintenance, not only bytes stored.

<a id="lt-m07"></a>
- [ ] **LT-M07 — Large-lineage erasure and tombstone compaction.** Trigger: SC11's correct implementation reaches measured lineage/overlay scale. Design dependency traversal, serving-time denial and safe compaction across summaries, vectors, accepted text, exports and supported media. **Exit:** interruption, archive restore and backfill cannot resurrect invalidated sources; deletion work and tombstone growth are bounded without dropping anti-resurrection authority. Fictional forgetting and account/privacy deletion retain separate policies.

<a id="lt-m08"></a>
- [ ] **LT-M08 — Very-large restore and degraded retrieval.** Trigger: backup/index rebuild time approaches selected recovery objectives. Depends on SC16, LT-M05–LT-M07 as used, and D58/D60. Restore authoritative source/head/permissions coherently, rebuild derived indexes progressively and define a truthful degraded recall mode. **Exit:** time to useful native play and time to complete qualified recall are measured separately; no new paid calls recreate history, and required evidence is never fabricated while an index warms.
