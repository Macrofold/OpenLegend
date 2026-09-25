# Action reconciliation: source and runtime observations

Recorded September 25, 2026. This is a focused record under [Verification](../verification.md), not an acceptance waiver. [AR tasks](../maintainers/action-reconciliation.md) own the remaining integration work; [profiling guidance](../maintainers/performance-profiling.md) owns reproducible invocation. Raw profiles, temporary worlds, credentials and full runner artifacts are not committed here.

## Source integrity and static checks

The exact committed source at `2f0e57bab7660413f5224ac52974ca7838c43ebb` was compared with the generated reconciliation candidate retained from run `36102378812`. Differences were the intended kernel import cleanup, decision-context import/sequence reduction/confirmation fallback changes, contact typing and cooperative retirement, follow restriction checking, death continuity cleanup, and subsequent docs/workflow changes. No unintended large-file source omission was found. This comparison does not prove behavioral correctness.

Production TypeScript and Vite builds passed on local Node 22.16.0 and GitHub Node 22.23.2. The final code slice at `d143461b85662b4ad7938968162e2674130b1cdb` also built in run `36181932510`; that runtime-review job completed successfully. Pinned Prettier passed for the changed perception-frame and profiler files. Vite retains its large-chunk advisory.

Ordinary CI is not green. Run `36105644927` stopped at formatting in `packages/domain/src/kernel.ts`, `scripts/check-agent-guidance.mjs` and `docs/maintainers/agent-guidance.md`, before typechecking/tests/build. The latter two files were inherited unchanged; the kernel import formatting is an action-replay follow-up. No automated unit/integration/browser suites were authored or invoked in this delegated session; existing repository CI was not disabled.

## Physical contact candidate experiment

The change in `c6a924c648735baa4ea50e77289e8ace9e01ed8e` sizes the physical grid using actual maximum body extent rather than the default 28-unit sight grid. Exact body overlap, line of effect, source ordering and evidence policies are unchanged.

A local ad-hoc comparison used Node 22.16.0 on AMD EPYC 9V74, seed 73, the touch-demo world, 100 added people and 500 distinct rigid resource objects. Contact-only sensing was explicitly assigned to the memory-capable participants. Both crowded and scattered layouts contained 615 total entities. Each process sampled eight frame lookups and advanced 30 fixed one-second native steps, with no database or model calls. These are short isolated observations, not a statistical benchmark suite or production capacity result.

- Crowded: 62,730 candidate examinations before versus 16,450 after; 444 exact directed contacts in both. The median of lookup samples after the first two was 8.945 ms versus 4.181 ms. Total native time for 30 steps was 6.457 s versus 2.149 s.
- Scattered: 62,730 candidate examinations before versus 2,779 after; 102 exact directed contacts in both. The corresponding lookup median was 11.242 ms versus 2.090 ms. Total native time was 6.182 s versus 0.702 s.

Ordered contact membership, complete emitted-event sequences and final-world digests matched exactly before and after in both layouts. Final-world SHA-256 values were `46fc1c0d0afe6a0cce5b680bfbaf66303f0e5eb8e5c03f04a51a447453d6e98b` crowded and `5fdc5dc7710d62429045a94e3a77a5b060bbded5eb9ce056719c43db74046b5d` scattered. These digests apply only to this matched scenario. Dense coincident bodies still incur legitimate contact work, and frame construction still samples the world.

A separate small native walkthrough observed one anonymous private onset, no repeated event while stationary, the same live episode after a JSON round trip, silent clearing when the detector was removed, a new episode when it returned, and one end event after source removal. The permitted contact view contained neither the source ID nor its name. A following activity stopped after the follower lost sight, rather than using a remembered target ID for tracking. This is not full save-store restoration, full sensor lifecycle coverage or revised-action approval acceptance; the existing TODO/AR coverage remains open.

## Full PostgreSQL diagnostics

The first recovered run `36105644998`, against `968b5358`, built production source but ran no gameplay phase. Plain PostgreSQL lacked the vector extension, producing SQLSTATE `0A000`; the old profiler then remained open until the workflow deadline. That result is an initialization/cleanup failure, not a performance measurement.

Run `36180280531` against `2f0e57` used PostgreSQL/vector on the same runner and Node 22.23.2, AMD EPYC 7763. Fifteen-second mixed phases achieved 0.820x at requested 1x and 0.701x at requested 3x. The dense phase achieved 0.0748x at requested 1x, with 18 successful commands and a 7,310 ms maximum. There were no storage errors; requested throughput was not met.

Run `36181932510` against `d143461b` used the committed reusable profiler without source patches, PostgreSQL 16.15 with vector on loopback, Node 22.23.2 and AMD EPYC 9V45. Mixed means 10 added people, 20 animals and 300 scattered objects; dense means 100 added people and 500 crowded objects. Each phase lasted approximately 15 seconds. Mixed commands requested 25 ms intervals; dense requested 500 ms. The separate client also consumed SSE, read state and sent presence heartbeats.

- Mixed, requested 1x: achieved 0.9995x; 453 successful commands; p95 57.0 ms, p99 165.2 ms, maximum 394.8 ms; event-loop maximum 47.3 ms; 148 skipped request intervals; approximately 0.31 pending simulated seconds at the sample.
- Mixed, requested 3x: achieved 1.4205x; 349 successful commands; p95 65.3 ms, p99 117.1 ms, maximum 231.3 ms; event-loop maximum 43.6 ms; 251 skipped intervals; approximately 1,247 pending simulated seconds.
- Dense, requested 1x: achieved 0.2878x; 20 successful commands; p95 186.9 ms, p99/maximum 5,882.5 ms; event-loop maximum 471.6 ms; 10 skipped intervals; approximately 114 pending simulated seconds.

All three phases reported zero rejected commands, no client errors and no storage error. SSE delivered bytes in every phase. Small samples make tail percentiles unstable; the dense maximum is important even though p95 is much smaller. Pending debt excludes wall time not yet admitted by an in-flight timer operation. The first mixed phase is cold and the second reuses its evolving world.

The two runner generations are not a matched before/after comparison: their CPU models differ. Moreover, ordinary default senses are sight/hearing, not touch. Do not attribute the different PostgreSQL speeds to the contact-grid change. Accelerated mixed throughput and dense responsiveness remain unqualified under PF00/PF11.

## Profiler ownership and failure observations

Commits `565ec02f` and `cb5af992` add the explicit `OPEN_LEGEND_PROFILE_POSTGRES_URL` path and profiler-owned startup cleanup. A fresh random database is created for each invocation; normal application database configuration is ignored. The supplied administrative database is not reset, and no force-drop or session termination is used.

In run `36181932510`, both successful scenes and the no-vector startup case left zero `openlegend_profile_*` databases in their respective disposable services. The no-vector case reported `0A000`, zero phases and a normal failure exit of 1 rather than a timeout, with no cleanup errors. A local refused-connection exercise also exited with a sanitized creation error, zero phases and no password in its report. The local SQLite fallback completed a five-second native server phase with no storage or cleanup error; this was compatibility evidence, not a production comparison.

These observations qualify the profiler's owned-resource path, not general `createGameServer` startup ownership for all callers. AR07 remains open. Process kill, remote topology, cleanup denial, occupied-database teardown and long-running multi-client/cognition workloads remain separate qualification work.
