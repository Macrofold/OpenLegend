# Workshop transport and funding continuation

This record covers the local authoring/MCP transport and native-run allocation changes on top of `e7ae25457ee6bf790c6cdab2e0ec56dec2029923`. [Raw observations](workshop-transport-funding.json) name the implementation checkpoint, synthetic inputs, runtime and limitations. It does not inherit live-model acceptance from earlier runs.

## Scope and method

Actual local application execution used Linux x64, Node 22.16.0, disposable SQLite worlds and the installed official MCP SDK. Production TypeScript (`tsc --noEmit -p tsconfig.build.json`) and the Vite production build passed. The existing approximately 2.661 MB minified / 720 KB gzip client chunk and PlayCanvas worker externalization warnings remain. No unit/test suites, browser automation, PostgreSQL service or real model/image provider was run. Actual provider spend was **$0**. All monetary examples below are synthetic ledger amounts.

## Local authoring and MCP writes

A 28,673-byte local authoring request containing a valid 23,000-byte JSON payload and multibyte intent passed through `createGameServer`, the shared input schema and native policy validator. The draft was retained without installation; replay returned the same draft. Apply before human approval returned `needs_approval`. The authenticated same-origin decision route approved the exact plan; Apply changed the cognition-policy revision once, and replay did not change it again.

Actual `/mcp` initialization and discovery using protocol 2025-11-25 exposed 18 current read/write tools. The runtime client accepted the SDK compatibility response's short SSE framing as well as JSON. A second large candidate was created and reviewed through MCP; the human HTTP decision followed by MCP Apply installed revision 3. Reopening the actual server retained revision 3 and the applied review. Native draft/approval/Apply used no inference and left spending/reservations at zero.

Malformed UTF-8 returned HTTP 400 from both adapters. An ordinary gameplay route still rejected an over-16-KiB body, and a candidate exceeding the unchanged 24,000-byte inner limit was rejected by its tool schema. A deliberately incomplete chunked authoring body was disconnected after approximately 10,004 ms; no declaration was installed. These are bounded local observations, not a complete adverse-network, proxy or browser matrix.

The manual driver initially assumed that a seed world explicitly stores the default cognition policy and that all SDK compatibility responses are JSON. Those driver assumptions were corrected to use the existing default policy and accept actual SSE framing; they were not production behavior changes. The successful observations above were repeated after both transports used the shared strict decoder.

## Native execution and funding

The actual OpenLegend HTTP turn runner, Macrofold request encoder, provisioner and native executor were exercised against an isolated loopback server returning explicitly synthetic Macrofold responses. This is transport/application evidence, **not** a real Macrofold server, native harness, model judgment, or billing invoice.

A $0.50 session with a new $0.10 worker allocation sent a $0.40 run cap, not a competing $0.50 model reservation. Both real application reservations succeeded. After a synthetic $0.04 completion, the second turn reused the same worker and remote session and sent a $0.36 run cap. Only one worker creation was observed. Replayed message IDs returned their saved completion; session context echoed by the synthetic responder was redacted from replies. Final exposure was $0.18 spent, including $0.10 uncertain worker cost, no outstanding reservations, and $0.32 available. The uncertainty is included in spent, not added a second time.

Separate execution against the actual SQLite ledger covered an already accounted $0.10 worker whose operational marker was lost while configured compute had risen to $2.00: the retained original worker request and uncertain attempt permitted a $0.40 model cap without another worker charge. An already provisioned worker needed no additional compute allocation. When the remaining amount could cover only compute, the allocator returned no runnable allowance. The existing atomic reserve still owns final authorization; this preflight is not a reservation or proof of provider admission.

## Bounded funding reads and native stress

With 25,000 unrelated attempts plus 50 attempts in the measured session, 100 in-process allocation reads had median 0.034 ms, sampled p95 0.119 ms and maximum 0.921 ms. SQLite selected the existing covering `attempt_budget_scope` index and primary-key attempt lookups. Synthetic insertion took 43.67 ms and is excluded from those read timings; initial index creation is also excluded. This is scoped-query evidence, not full-month accounting throughput or stable percentiles.

The existing committed native stress scenarios ran 180 steps with frozen snapshots, no warmup and requested 3× speed:

| Scenario | Entities | Native loop | Largest step | Headroom at 3× |
| --- | --- | --- | --- | --- |
| Gems / 500 ground objects | 514 | 1,538.01 ms | 100.56 ms | 0.650 |
| Mixed people, animals and resources | 344 | 1,378.02 ms | 259.70 ms | 0.726 |

Both headroom values remain below the required 1. The mixed run retained 3,254 events and 3,474 awareness entries. This pass changed no native simulation effects and performed no paired domain optimization; different historical timings are not a speedup/regression claim. Raw profiles remain outside version control. PF/EPR/SW still own population, cold-encounter and full-application responsiveness work.

## Remaining gates

Real Macrofold connector/model usefulness, hosted authentication, full browser accessibility, PostgreSQL allocation/recovery concurrency, actual image generation and aggregate image-inclusive funding remain unqualified. The branch is not rebased to the separately inspected current main in this pass. [WW07, WW10 and WW11](../maintainers/world-agent-writes.md) retain the relevant delivery gates; [maintainer TODO](../maintainers/TODO.md#workshop-transport-and-funding-regression-coverage) holds deferred regression cases. No existing regression group is made obsolete by these manual samples.
