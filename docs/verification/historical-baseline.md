# Historical baseline and acceptance snapshot verification

These are recorded observations from the original verification log, not a new run. “Current” refers to each observation’s recorded revision. [Verification index](../verification.md) · [Current acceptance owners](../maintainers/README.md).

The automated-results table records September 20-era runs. Its product-limit and open-acceptance snapshots are historical; consult current specifications and trackers before treating them as requirements.

## Current automated evidence

| Area                                               | Current result                                                                                                             | Scope and limitation                                                                                                                                                                                                            |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formatting, strict TypeScript and production build | Pass on the latest recorded September 20 run                                                                               | Build emits the existing large-chunk warning.                                                                                                                                                                                   |
| Chromium UI scenarios                              | 8/8 pass                                                                                                                   | Covers native gameplay, actions, camera, vision, time/presence, React layout, continuous work/themes/scale and private diagnostics with no credentials or paid calls. Device and assistive-technology coverage remains bounded. |
| Focused cognition/cancellation                     | 49/49 pass                                                                                                                 | Covers awareness-backed evidence, context refresh after attention, no autonomous dispatch without complete credentials and abort-as-cancellation. No paid calls.                                                                |
| Non-HTTP test run                                  | 159 pass / 8 fail                                                                                                          | Remaining failures concern catalogue, context ordering, schema-version and journal assertions.                                                                                                                                  |
| Full UI-change baseline comparison                 | 140 pass / 37 fail after UI changes versus 136 pass / the same 37 failures at unchanged HEAD                               | Four new native trait/description/fact scenarios pass; the UI work introduced no new failing test name in that comparison.                                                                                                      |
| Later shared-worktree run                          | 139 pass / 38 fail                                                                                                         | Concurrent recall/storage changes added the no-credentials/paused fixture failure. This does not alter the earlier UI comparison.                                                                                               |
| PostgreSQL pgvector sample                         | Migration/isolation/deletion/top-24 path pass; 2,000 vectors at 512 dimensions returned 24 IDs/scores in about 15 ms       | Synthetic local data, one sample, exact search; no semantic-quality or production-capacity claim.                                                                                                                               |
| God editors                                        | Focused domain, same-origin HTTP and Chromium flows pass                                                                   | Covers person creation, trait validation, paused edits, finite spawn catalogue and person revival. Broad conflict, revocation and mature-data scaling remain open.                                                              |
| Persistence and public patches                     | Native journal recovery, compact backup, bootstrap/SSE, retained-revision replay and editor deletion persistence exercised | Small seed world only; one routine tick produced a 151-byte patch versus a 15,368-byte full view. Crash windows, PostgreSQL recovery, slow readers and mature saves remain open.                                                |

A sandboxed full run also encountered ten loopback `listen EPERM` setup failures; that run is not evidence about the HTTP assertions.

## Current live-provider evidence

Capped isolated checks exercised native multi-question Jev, embeddings, immediate speech, summary generation and workspace-to-PostgreSQL publication. A need-event case selected a carried-berry memory, routed level 2 and committed eating. A dream became eligible after 7,200 sleeping seconds and published an imagined thought, but the content quality was minimal. These checks establish connectivity and lifecycle paths only. They do not establish broad conversational quality, recall quality, latency or sustainable cost.

No fixture, synthetic vector run or manually authored response counts as live-model quality acceptance. Live evidence must record model identifiers, routes, provider receipts, configured price assumptions, latency, failures and the authorized spending cap.

## Open acceptance

- The [cognition tracker](../maintainers/cognition-redesign.md), especially CR12 and its migrated acceptance gaps, owns privacy, recall, routing, consolidation, reflection, sleep/dream, cancellation, recovery and token/latency completion.
- The [narration tracker](../maintainers/narration-and-conversations.md) retains response-to-speech/recall integration, durable conversation lifecycle, Narrator privacy, ordering, storage, transcript and live prose-quality acceptance.
- The [actor tracker](../maintainers/actor-model.md) owns cross-species migration, lifecycle, body effects, optional minds and compatibility evidence.
- The [invention tracker](../maintainers/inventions-and-world-evolution.md) owns the live invent-to-craft/use loop, semantic reuse, workshop, conjuring and mechanics-evolution evidence.
- The [production-data tracker](../maintainers/production-data.md) owns migration, restore, normalization, query, hosting and measured-scale gates.
- The [performance tracker](../maintainers/performance.md) owns native latency attribution, query/CPU reduction, scheduling and performance regression budgets.
- Cross-cutting UI, editor, journal, patch and documentation checks remain in [Maintainer TODO](../maintainers/TODO.md).

## Current product limits

The current runtime is one local owner in one personal world. The finite G1 envelope supports three construction families without a fixed recipe-count ceiling. AI work is bounded; only an importance-and-urgency supersession may automatically refresh an immediate response, and it can do so once. Narrator generation has no automatic paid retry. Recent immediate-response receipts retain the newest 300 entries; this does not cap actor memories, world events, durable jobs or story history. Audio voice, multiplayer, shared-world synchronization, broad workshop mechanics, deep anatomy, full thermal simulation, arbitrary G2 execution and commerce remain outside the implemented slice.
