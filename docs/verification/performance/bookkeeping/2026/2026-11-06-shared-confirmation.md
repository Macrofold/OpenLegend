# Shared confirmation and history repair — November 6, 2026

[BK26/BK27](../../../../maintainers/production-data.md#bk26--sensory-deadlines-and-attention-preparation-proposed) own this implementation and its experimental adoption. [The technical plan](../../../../projects/bookkeeping-simplification-tech-design.md#19-reviewed-source-work-removal) and [runtime companion](../../../../projects/bookkeeping-simplification-runtime-design.md#11-history-intent-and-metadata-read-repairs) retain the contracts and stop conditions. S2 is excluded. Operating, mature-history, cleanup and population gates remain independent.

## Source and scope

Repository: Macrofold/OpenLegend, local `codex/stealth-runtime-01-evidence`, starting commit `f7353e241d4d62e5fa1136cbecc7f5ed9c963075`.

| Source                                     | Scope                                                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `4a0858f8e6c2e34dc342a99ba6ea8509355ce4f9` | R1 admitted-history application, including protected writes.                                                |
| `5cfba29f6d7fb067fbfe78616959470be1f62933` | R1 plus R2 membership-only reads; repaired comparison control.                                              |
| `d66a8cdac6b8a85e819c2d9b5ae46216d890e906` | P1 with selected-native read reuse; isolated control without N2. This commit creates no branch or checkout. |
| `6dd7e38c9dbe7d975de13d8470c7573d3d8ea436` | Same P1 implementation plus the N2 status-validity candidate.                                               |

P1 changes the current format to database schema 56 / `development-2026-11-06-shared-sight-confirmation`, without an older reader. All checked worlds/databases are disposable; no existing developer save was replaced. No checkout/branch switch, unit-suite run, new maintained test or paid model call accompanies the implementation. Additional and cumulative Jev cost is $0. Fixture/native request checks do not establish live-model response quality or graphical play.

## Connected correctness

Local checks run after source implementation; their incidental elapsed times are not speed evidence. TypeScript and production build pass, including the repository asset guard. Existing browser-worker externalization and bundle-size warnings remain; renderer behavior was not changed.

- **R1: ten connected checks.** The actual service preserves 1,025 exact canonical event IDs/bodies/totals, including 496 events evicted before first saving, a detached save prefix, 257 later changes and an empty cut. Five real speech perspectives agree with permitted history. Protected cold rewrite, correcting speech, forgetting without erasing another witness, explicit deletion, stale/unscoped refusal, pre-start refusal, executing-write rollback/fault latch and full repository reopening pass. Ordinary projections remove zero events; the intentional deletion removes one. Final durable reopening contains 1,026 events after subsequent real speech.
- **R2: sixteen connected checks.** Actual service prefix/suffix membership reads examine zero native body inputs, with an uncached poisoned-source negative control. The real suffix is 4,848 body bytes. A separate constructed adapter specimen repeats 73 real writer rows totaling 718,510 bytes: headers succeed while ordinary SQL retains the 512 KiB preparation refusal. This is an adapter work-bound check, not a valid large gameplay-save claim. Selected true-recent reads still load a body. Seven aliases, two local individuals, independent observers, pending replacement/deletion/reacquisition, parent removal, stale revision refusal, correction, forgetting and full cold validation pass.
- **P1: fifteen native checks and the existing actual supplied-context consumer.** Checks cover same-time full/partial/full order and frames, partial-first acquisition, unchanged broad content/raw dates, original pose separation, independently stale detail, filtered location capture, frame references, last-seen closure, cold loss/reacquisition, exactly-once familiarity and bounded failed-baseline recovery. The existing consumer exercises an unknown crowd, acquired cliff relationships, delayed remembering, independent observers and correction/forgetting fences.
- **N2: six owner checks plus five existing native integration checks.** Already established validity is reused; retaining one actor does not hide another's mutation. Status activation/deactivation, complete rates, changed/exact deadlines, unknown-feed fallback and current-format restoration pass. The existing long/subdivided native check preserves RNG and ten moving foragers; its maximum position difference is `1.42e-14`. Work exhaustion still rolls back through its owner.

The actual `AiDirector` also reaches an injected provider, holds its finite context while native advancement proceeds, and completes its job. The old raw request/binding comparator fails because P1 renumbers issued IDs and changes internal proof versions/receipt positions; that failure is retained. A separate bounded comparison joins only exact captured native entity, field, channel, acquisition and occurrence anchors, establishing equivalent supplied facts, labels, chronology, uncertainty, instructions, schema, budgets and response authority. It does not rewrite raw hashes or remove arbitrary references. Internal representation differences remain explicit. Ordinary broad renewal permits delayed remembering; actual correction invalidates the same cut and the response owner refuses the old request. External transport and paid calls are zero; this is not live-provider quality evidence.

Setup failures are preserved separately: a missing public export was an integration defect fixed before acceptance; fixture assumptions about pinned event rollover, canonical notification counts, speech size, presence/backpressure and continuing a service after replacing its repository baseline were corrected. None is counted as a passing attempt or a speed result. Owned disposable databases were dropped.

Raw scenarios/results and hashes remain outside Git under `/Users/mzw/.codex/verification/OpenLegend/experiments/2026-11-06-followthrough/` and `/Users/mzw/.codex/verification/OpenLegend/experiments/2026-11-06-revised-runtime/r1-n2/`. The latter manifest preserves the actual R1/N2 source and logs. Complete affected-source review found no remaining known integrity issue; performance adoption is separate.

## AWS comparisons and adoption

Isolated staged comparisons, the A5/Q1 eligibility census and final full-feature measurement are pending. No speed, headroom, cleanup sustainability or population improvement is claimed from the connected checks above.
