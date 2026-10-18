# Can the game reuse unchanged character-meter definitions?

October16,2026. **Completed native diagnostic; only a small CPU saving, no integration.** Hunger, energy and other character meters need their installed definitions when the game checks conditions and predicts changes. The current profile shows repeated definition lookup costing about0.54seconds in a30.75-second recording. That includes about0.24seconds of overlapping temporary-edit-library work; the figures must not be added.

| Trial                               | Changes                                                                                                                  | Must preserve                                                                                                                       | Result  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Shared immutable definition lookups | Snapshot only the actual definition list when needed; reuse an ID lookup only while the list and entry IDs cannot change | Every definition/value, mutable authoring edits, first duplicate match, missing IDs, safe detached results and actual game behavior | Pending |

This is a bounded trial of one shared calculation owner. It does not remove hunger, needs, status effects, animal behavior or memories. The planned reuse applies only to frozen lists with frozen entries; mutable lists and mutable entry IDs retain direct current lookup. Replacing definitions must produce a fresh lookup. No new dependency or stored-format support is introduced.

Full source, types, package identity and real navigation-worker checks precede controlled definition-edit cases. Complete native world/event/outcome comparisons and identical older-workload reverse timing follow only after correctness passes. A positive small test is not a running-server or smooth3×pass; real saving and game follow-through are required before retention. Negative results remain documented.

[Standalone remaining gaps](bottlenecks.md) · [Project plan](../../projects/three-times-scene-performance.md#shared-meter-definition-lookup) · [Experiment register](../../maintainers/performance.md)

The first static qualification stops on the unchanged baseline before the real worker starts: its copied launcher accidentally changes the existing worker-helper filename date. Baseline formatting/type checks pass, but no worker, candidate case or native timing is qualified by that attempt. Preserve the failed log/result. A separately named qualification sequence corrects only that helper path; all source and actual-worker requirements remain.

The corrected worker check passes, then the baseline case helper fails before any case on an existing internal-module import cycle. The helper loaded an internal owner directly, unlike the actual application, which initializes the domain package first. Preserve that failure and qualify a new helper using the actual package entry before the internal accessor. No engine source, case expectation or runtime gate is changed. Candidate execution and native timing remain unreleased.

PF16.147's first actual candidate passes types and the real worker but fails the strict no-draft-result case: reading only the definition-array snapshot can leave a nested live draft in its returned values during authoring. Baseline passes all24cases. Preserve this real correctness failure and do not release native timing or saving for that candidate. Before new private edits, reject that snapshot shortcut entirely and narrow the trial to the immutable first-match ID index, retaining the original full safe snapshot behavior. A new candidate directory/index and separately named static sequence must pass the same24cases without weakening them. No canonical source changed.

## Safe lookup-only result

The narrowed candidate restores the original full safe definition snapshot. Both versions pass all24controlled cases with identical complete definition values and selection digests, plus formatting, TypeScript, six imports and real separate-worker checks. A complete native replay then matches **all80serialized world/event/outcome checkpoints byte for byte**, without projecting any gameplay field. Both complete2400game seconds,32plans,16own-produced-food checks,14walks and16returns, with all40animals alive. Their complete trace digest is `9ebb0319f3dfb02872a604a843ee4a3e6b310997f87557b368605629d3847007`; raw final-world digest is `b9d90fcd18f43b5738b5a51764c9a9d541ce8df118e56c9557a72a0cf5c29c42`.

| Fixed older-workload run | Version              | Process CPU |
| ------------------------ | -------------------- | ----------: |
| 0                        | Original lookup      |   31,945 ms |
| 1                        | Cached immutable IDs |   31,874 ms |
| 2                        | Cached immutable IDs |   31,149 ms |
| 3                        | Original lookup      |   31,751 ms |

Means are **31,848→31,512ms, 1.05% less CPU**; native CPU30,534→30,262ms. Each run performs exactly6000game seconds/200anchors/53plans/37food checks/34walks/16returns, with all40animals alive. Complete raw final worlds are identical across all four; no sampler/counter/trace/proof writing, provider or forced collection runs during timing. All sources/inputs/dependencies/process closure checks pass. This small saving is not an explanation for the severe slowdown. Keep it private while pursuing larger measured costs; no actual-server benefit or canonical retention is claimed. Saving and running-game follow-through are unrun because integration is not selected.

The unsafe snapshot shortcut remains rejected on correctness, independently of the safe index's small performance result. Evidence: `/private/tmp/ol-pf147-static-result-20261016-d.json`, `/private/tmp/ol-pf147-native-proof-lifecycle-20261016-a.json`, `/private/tmp/ol-pf147-native-timing-lifecycle-20261016-a.json` and all earlier failed logs/case records. Provider additional/cumulative cost remains $0.
