# Factorio — doing less simulation without losing its meaning

| Field | State |
| --- | --- |
| Coverage | G27 intelligence/optimization supplement; not a new full-game certification. |
| Reviewed | 2026-10-14 |
| Existing material inspected | [Parent dossier](../factorio.md), sections 1–7, at OpenLegend `57a2977e22bab3f7293caa4a176c9ef4ba800751`. |
| Evidence | Developer technical articles; no benchmarks reproduced. |

[Research ledger](../../research-progress-intelligent-simulation-2026-10-14.md) · [NPC guide](../../synthesis/characters-companions-and-relationships.md)

Factorio is relevant even though a conveyor belt is not a mind. It exposes the difference between making the same calculation faster, eliminating an unnecessary calculation, and changing the simulated rules. Those distinctions apply directly to large populations executing already-chosen activity.

## Four primary implementation accounts

**Inactive work.** The 2016 optimization article describes sleeping inactive entities, avoiding collision checks when no relevant moving entity is present, and aggregating some electricity calculations. It also identifies pending work; a proposal in that article is not automatically a shipped feature of that version. [F1]

**A different representation of the same moving sequence.** The 2017 belt article stores gaps between items in a connected transport line rather than updating every absolute item position. Most interior gaps remain unchanged; tracking the last nonzero gap further reduces scanning. Insertions, merging and interactions complicate the invariant. The dramatic belt-kernel improvement is not the same as the reported whole-factory UPS improvement. [F2]

**Sleep, interpolation and failed parallelism.** The 2024 article describes inactive roboports and circuit-controlled lamps, reduced robot update frequency with interpolated presentation, and parallel circuit evaluation. Its attempted parallel electricity work exposes memory-bandwidth and shared-state constraints. It is especially useful counterevidence to 'more threads will solve simulation scale'. [F3]

**Candidate selection changes behavior.** The August 2026 expansion-group article traces a change in enemy pressure to how candidate settlement positions were searched. Larger explored areas changed the choice distribution; fixes narrowed relevant candidates and adjusted behavior. Assumptions appropriate to one enemy family did not automatically fit another. [F4]

Sources, read as developer-authored full article bodies:

- [F1: Friday Facts 148 — Many optimizations](https://www.factorio.com/blog/post/fff-148), 2016.
- [F2: Friday Facts 176 — Belts optimization for 0.15](https://www.factorio.com/blog/post/fff-176), 2017.
- [F3: Friday Facts 421 — Optimizations 2.0](https://www.factorio.com/blog/post/fff-421), 2024.
- [F4: Friday Facts 445 — Changes to enemy expansion](https://www.factorio.com/blog/post/fff-445), 2026-08-07.

## Transfer 1: make the unchanged case almost free

Our inference is that a person carrying out an unchanged intention should not require rebuilding a full prompt, rereading all memories, rediscovering every reachable object and then paying a model to say 'continue'. Native progress, relevant dependencies and a next review point can preserve an existing decision.

The hard part is not installing a timer. It is establishing what could invalidate the choice and making those changes observable. Sleeping work without a correct wake-up route can be cheaper only because it silently misses the world. A stale cache is a behavioral defect, not an optimization.

For a hypothetical workshop, an idle machine can sleep until a relevant input, power or permission changes. A person can continue an agreed repair until completion or reconsideration. But the person's desire to repair is not equivalent to a machine's enabled flag. A periodic opportunity for reflection may remain appropriate even while mechanical prerequisites are unchanged.

## Transfer 2: preserve an invariant, not every intermediate representation

The belt example suggests looking for portions of activity whose intermediate detail is derivable. On an unobstructed accepted journey, elapsed progress may be computed from a saved start and rate instead of writing a new full travel record every frame. This is a research direction, not approval of a new movement contract.

The conditions matter: another person may encounter the traveler, a hazard may appear, a destination may move, or a speed-affecting injury may occur. Rendering interpolation does not authorize skipping authoritative collision or observation. Apply the compact representation only while its assumptions hold, and process the first relevant boundary in the right order.

Likewise, aggregate interchangeable stock for a computation only when individual properties do not matter to that computation. An heirloom and an ordinary cup cannot become interchangeable simply because they share a material. A shared definition can be cheap while instance ownership and history remain distinct.

## Transfer 3: cheaper search must not choose a different life accidentally

A narrower candidate search can be exact if it removes impossible or irrelevant candidates. It is an approximation if it discards a possible choice because it is distant, unusual, low-ranked or difficult to describe. The second kind needs behavioral evaluation.

For OpenLegend, a shortlist that always favors the nearest food may eliminate visiting a friend, respecting ownership or keeping a promise before cognition ever begins. The model cannot recover a meaningful alternative it is neither shown nor allowed to propose. Measure candidate recall for consequential exceptions, not just the ranking of the surviving options.

## Transfer 4: parallelize independent preparation, reconcile shared consequences

Several characters can retrieve permitted context or request decisions concurrently. They cannot all consume the last meal because each saw it available. Shared resources, admissions and outcomes need one authoritative reconciliation path. Parallelism should not multiply ownership or permit double-spending.

A faster action-selection phase may expose a memory-bandwidth, path-query, serialization or world-mutation bottleneck. Profile the entire episode. Avoid a speculative rewrite into an entity-component system or GPU engine before identifying a substantial, repeatable cost and the semantics that must survive.

## Evaluation and limits

Compare the same workload and causal rules before/after each optimization. Report simulation seconds advanced per wall second, active population, interactions, movement and inference calls separately. A microbenchmark can establish a kernel improvement, not the maximum sustainable intelligent population. Faster fictionally accelerated time also increases how many meaningful events may need consideration per wall second.

The parent dossier retains gameplay, reception and version information. This supplement does not claim that Factorio's machines understand their purpose, that its optimization numbers transfer to OpenLegend, or that reducing every subsystem's fidelity is harmless. The lesson is disciplined selectivity, including the cases where a proposed optimization did not work.
