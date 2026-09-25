# World Agent navigation and custom-value continuation

## Scope

This continuation starts from `4603a539fbc882f16e078207af815fe573e01451`, which already contained writable MCP, operational authoring sessions, exact review/Apply, six kind adapters, and the native Macrofold execution adapter. It adds world-entity discovery, bounded definition-relationship tracing, matching owner-inspector controls, and a seventh adapter for reviewed existing custom-attribute values. [The operation contract](../world-agent-inspection-and-edits.md) and [WW12–WW15](../maintainers/world-agent-writes.md#navigation-and-custom-value-continuation) distinguish this delivered subset from general composition. No new engine primitive, physics rule, dependency, database, wallet or saved-world format was added.

Manual isolated execution used Linux x64 and Node 22.16.0 with local SQLite and provider funding explicitly disabled. Production TypeScript compilation and the Vite client build passed; the approximately 2.663 MB minified / 720 KB gzip main chunk warning remains. No unit/test suite, browser automation, live Macrofold harness, PostgreSQL workload or paid API call was run. Provider spend was **$0** and the attempts table remained empty. [Aggregate observations](workshop-navigation.json) retain named workloads; private temporary drivers and CPU profiles are not committed.

## Actual MCP, HTTP, native changes and recovery

A real `createGameServer` served an isolated world with automatic ticking disabled for controlled native stepping. MCP initialization used the installed SDK and protocol 2025-11-25; the manual client handled both JSON and the SDK's short compatibility SSE framing. Discovery returned 20 tools, including `ol_entities`, `ol_trace`, draft and Apply operations. Oversized trace arguments produced the SDK's tool-validation error. This is direct transport execution, not a scripted claim of native-harness usefulness.

World-entity discovery returned two entries plus a continuation and located the controlled actor by name. A real definition trace returned six nodes/five witness edges with projection-specific coverage. The world's digest stayed identical across those reads. Separate synthetic graph/directory exercises covered exact path references and movement-stable paging.

Through actual MCP writes and authenticated same-origin human review, the caller installed a custom charge reservoir and separately bound it to one body at value 50, revision 0. An `attribute-values` draft proposed 10; its review explicitly named the 50→10 change and source-free creator intervention. Apply before human approval returned `needs_approval`. Approved Apply changed the value to 10 and activated the native low-charge concern. Replay returned the same receipt without another change.

A second approved draft proposed 35. One real native game second drained charge from 10 to 9; its old Apply then returned `stale-review`. The caller read the new revision, submitted revision 2 of that draft, validated, requested another exact human review and applied it. Closing/reopening the actual server preserved value 35, revision 3 and cleared low-charge concern. No hypothetical scenario was added to an actor's memory and no physical recharge was claimed. This qualifies a narrow current-value/revision path, not a complete crash/concurrency matrix.

## Bounded graph work

A five-node synthetic graph exercised a directed chain with a cycle, reverse traversal, a zero-hop root-to-self path, disconnected target, depth cutoff and node cutoff. Found paths returned actual source edges; a bounded frontier returned unresolved rather than claiming no path. An obsolete root revision was rejected. These are manual examples, not independent exhaustive graph correctness tests.

Each star workload ran 100 traces limited to 40 visited nodes. The returned tree had at most 39 witness edges and an explicit continuation frontier. Index construction is measured separately and is not free.

| Synthetic nodes | Index build | Median trace | Maximum trace |
| --------------- | ----------: | -----------: | ------------: |
| 1,001           |     2.45 ms |     0.421 ms |      1.709 ms |
| 10,001          |    27.34 ms |     0.413 ms |      0.929 ms |
| 30,001          |    71.29 ms |     0.367 ms |      2.798 ms |

A no-match relation filter completed at 1,001/10,001 nodes after 1/10 pages. At 30,001 nodes it stopped after 16 page expansions and returned a bounded frontier—not a false complete negative. This does not implement general impact closure, persistent transitive indexing, or large-world source extraction. All timings are local synthetic observations, not production percentiles or HTTP throughput.

## Entity directory work

Synthetic frozen rosters contained 1,000/10,000/30,000 entries. Initial lookup including sorted roster signature took approximately 0.93/3.59/10.14 ms. One hundred cached 20-entry reads took 9.61/13.30/34.15 ms total. After changing one position, recomputing the roster and continuing the cursor took 0.45/3.25/9.08 ms. The second page began at the next member; a name change correctly invalidated the old cursor.

These are directory projections over synthetic entries, not fully simulated populations. Current reads can rebuild the roster after an entity-map change. That work is on demand and bounded, but still synchronous on the application thread. Sustained authoring pressure may justify a mutation-maintained roster revision later (WW15); this small slice introduces neither a per-tick scanner nor a speculative distributed index.

## Native stress

The unchanged `scripts/stress-native.ts` ran the committed gems/mixed scenarios, 180 steps, zero warmup, frozen snapshots and requested 3× speed. This pass did not modify native simulation; there is no before/after optimization claim.

| Scenario                       | Entities |        Loop | Largest step | Required-rate headroom |
| ------------------------------ | -------: | ----------: | -----------: | ---------------------: |
| 500 ground objects             |      514 | 1,514.01 ms |    108.25 ms |                  0.660 |
| Mixed actors/animals/resources |      344 | 1,459.43 ms |    275.09 ms |                  0.685 |

Headroom below 1 does not sustain the requested rate. The mixed run retained 3,254 events and 3,474 awareness entries. No physical effects, witnesses or simulation time were skipped. Encounter/perception, draft finalization and current status-effect work remain under PF/EPR/SW; authoring index performance does not establish native population capacity.

## Remaining gates

Current connector tool ceilings must approve new names; existing frozen sessions/runs do not inherit broader grants. Live Macrofold model/tool usefulness, image generation and complete image-inclusive funding, graphical graph editing, full interaction closure, broader bodies/senses/laws, browser accessibility, full-host PostgreSQL and sustained mixed authoring/native load remain explicitly unqualified. WAC02, IRF02–IRF06/09 and UWA03/05/07/10 in `docs/maintainers/TODO.md` remain the automated owners, with exact continuation cases in WW delivery. No existing regression task becomes obsolete because these manual examples passed.
