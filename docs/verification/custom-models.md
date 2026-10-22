# Custom models — implementation and acceptance

## Scope and tested sources

The [feature](../projects/custom-models-feature-spec.md), [technical design](../projects/custom-models-tech-design.md), [delivery plan](../projects/custom-models-implementation-plan.md) and [MX tracker](../maintainers/custom-models.md) own the agreed scope. Production routing and thin benchmark/report extensions are implemented. Actual Macrofold HTTP acceptance and live hosted-model operating acceptance are separate from the local evidence below.

| Component                                   | Inspected/tested version                                                                                                                                                                                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OpenLegend repository/base                  | `Macrofold/OpenLegend`, `origin/main` `27c6fb8152ec58c34334e74ba91a9d5bec6a30ff`                                                                                                                                                                                               |
| Preserved approved design                   | PR #40, `05d2bb034cea0f717c54efedee019f74906849c6`                                                                                                                                                                                                                             |
| Production implementation                   | `feat/production-custom-models`, `338d96b52a19c28307be6e8183795f83066365db`; later review removes one redundant target check without changing the owning decoder                                                                                                               |
| Runtime/package manager                     | Node `v24.13.0`, pnpm `10.33.0`                                                                                                                                                                                                                                                |
| TypeScript / validation / formatting        | `7.0.2` / Zod `4.6.5` / Prettier `3.6.2`                                                                                                                                                                                                                                       |
| OpenLegend client                           | Repository `@open-legend/ai` HTTP transport, not a separately published Macrofold SDK                                                                                                                                                                                          |
| Initial Macrofold inspection                | Design/planning head `2dcf34bffbb9519b6fedac6175ea93cd7d7c4404`; generated API blob `b18f6bd4cff160e472ba97fd0b1692ea7c538574` lacked deployment bindings                                                                                                                      |
| Subsequent actual implementation inspection | Local `/Users/mzw/.codex/worktrees/9838/AgentCloud` includes the new deployment adapter and generated clients as uncommitted work on `07ba0ee1bb5c76aeb4d0d3553339dc274854335a`; remote `4093c429ff3e2c10c50350224e22b56ba36b70dc` does not yet include that inference adapter |

The approved canonical contract guided implementation while Macrofold was being built. Actual-source comparison then aligned capability preparation with the implemented adapter: protocol structural fields do not require `accepted_parameters` entries, while native schema keywords include annotations and `$schema`. No guessed alternate API or complete competing wire schema was introduced. A package label such as `macrofold@0.1.0` alone is not compatibility evidence.

## Implemented behavior and review

Strict trusted configuration selects either or both actual NPC reply purposes before the existing spending reservation. Missing configuration preserves defaults; malformed supplied fields fail locally. Shared immutable capabilities coalesce descriptor reads, avoid compatible warm polling and permit a bounded refresh of stale limitations with the shared 30-second cooldown. A new admitted revision invalidates later preparation without rejecting that completed answer. Pins retain their deliberate meaning; completed-only runtimes remain usable.

Native JSON Schema, JSON object and explicitly prompted JSON share one parser and complete local schema validator. Existing context/reference validation and native publication remain authoritative. Metadata waits consume the original elapsed deadline, and conversation/source permissions are rechecked after metadata and immediately before dispatch. Operational receipts retain the original target/pin across restore; accepted Run recovery does not use current target configuration or replay inference. Missing token usage remains telemetry uncertainty; known zero request fees settle separately from hosting.

Thin tools reuse existing preparation, finite plans, journals, executors and reports. They preserve source/case/reference identities, distinct replicate identities, first attempts, coverage, actual revisions, failure categories and unknown/shared hosting costs. The existing 20 MB evidence envelope rejects provably oversized metadata before expansion. No study is needed for gameplay and no default model changed.

Independent component reviews covered the full AI, configuration/cache, server integration and benchmark diffs. Fixed findings included stale-source disclosure after metadata waits, original monotonic expiry, original target/pin recovery, failed-Run target checks, distinct canonical service diagnostics, request-only zero-fee settlement and bounded experiment expansion.

## Static and existing checks

- Repository `pnpm typecheck` and `pnpm build` passed. Build includes generated configuration, production TypeScript, Vite and the asset guard; existing PlayCanvas `node:worker_threads` externalization and large-chunk warnings remain warnings.
- Existing AI checks passed: 41 Macrofold and 38 direct-client cases.
- Existing benchmark checks passed: 89 cases, including the final narrowed journal-accounting correction. Corpus validation retains 724 scenes, 4,000 questions and 80 generation cases, digest `01a9160827f6e649aac11353fb1621df0757a720260f18a16a474343683dd21e`.
- An initial parallel server run passed 11/15 cases and hit four existing 15-second timeouts in setup/durable authoring checks. The affected durability/admission files then passed serially: 9/9, with test timeouts unchanged. A separate focused zero-budget case passed. The cognition-verification file passed in the original run.
- Pinned formatting, full affected-diff inspection and whitespace checks are applied to final source. Required current-head CI remains a merge gate and is reported separately.

No new automated test files, infrastructure, generated verification artifacts or credentials were added.

## Focused injected-HTTP and native gameplay evidence

These scenarios use synthetic upstream answers and blocked external origins. They establish mechanics and boundaries, not live hosted-model quality or GPU capacity.

| Scenario                                 | Observed result                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Offline configuration                    | Both purposes, four policies, pins, nested immutability, output reductions and twenty malformed settings passed; no network                                                                                                                                                                                                        |
| Shared capability preparation            | Concurrent work shared one descriptor read; compatible warm calls added none; cooldown/upgrade/pin recovery, actual revision invalidation and completed-only/required streaming behavior passed                                                                                                                                    |
| Shared AI adapter                        | Twenty private cases passed across modes, strict malformed/truncated/tool-only output, stream acceptance ordering, accepted-Run observation, UUID normalization, original pinned receipt recovery and missing usage with zero request fees                                                                                         |
| Existing benchmark end to end            | Ten validated completions across three output modes, configured baseline and existing generation with two replicates; one descriptor read; offline preparation/reporting and completed resume added no calls                                                                                                                       |
| Benchmark refusals/bounds                | Definitive Macrofold Run-less refusal stopped the shared resource, released only its proven unadmitted hold and left the sibling replicate unattempted. Existing direct-provider quota holds remain. Oversized preparation, aliases, high cache prices and malformed receipts passed                                               |
| Real NPC producer and native publication | Actual `WorldService`, `AiDirector` in its live-model routing mode, `MacrofoldBackend` and disposable PostgreSQL: fast/native-schema and complex/JSON-object replies each committed exact NPC speech; wrong deployment and unavailable addressee results committed no speech; Jev-only mode made no generation or descriptor calls |

The gameplay scenario submitted nine synthetic inference requests (five Jev routing and four deployment generations), read two deployment descriptors, published two speech outcomes and rejected two model results. Disposable DB creation took 205 ms; world initialization/control/presence/sight took 19,405 ms. Fast, complex, wrong-target and wrong-reference turns took 465, 293, 384 and 234 ms; Jev-only took 415 ms. Cleanup took 1,235 ms; total was 22,647 ms. None of its 90-second phase guards expired. These turn times are local fixture measurements, not model-serving latency or population capacity. The setup duration demonstrates why a 15-second total fixture timeout can expire before inference.

Raw private scenarios/results remain outside Git under `/private/tmp`; no prompt/result dumps are committed. Disposable databases and the gameplay fixture's resources were cleaned up.

## Actual-server and hosted-runtime acceptance

Joint real Macrofold API verification is being performed through its actual HTTP handler and existing disposable database/authentication owners, with only the upstream chat endpoint synthetic. Its completed result and exact source/client hashes must be recorded before MX06's joint HTTP criterion is checked. This does not replace live hosted-model checks.

Real hosted-model inference, automatic same-revision host recovery, deliberate service updates/pins under real load, representative warm/concurrent GPU measurements and hosting costs remain unverified. Model/hosting selection, credentials and a bounded usable deployment are required for those checks; synthetic answers do not qualify them. MX06 retains each open acceptance criterion and MX07 comparative research remains outside this assignment.

## Cost and cleanup

Additional Jev cost is **$0**; cumulative paid task cost is **$0**. No paid model calls, GPU hosting, credential changes or shared-service destruction occurred. Synthetic request reservations/costs above are fixture accounting, not actual charges. Hosting cost is unmeasured, rather than declared free. Local fixture listeners/databases are task-owned and require confirmed cleanup in their completed joint-test record; borrowed shared services are never stopped.
