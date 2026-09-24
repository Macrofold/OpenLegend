# Domain

This subtree owns authoritative simulation. Keep I/O and orchestration outside it; preserve saved RNG, simulation-time semantics, phase order and serializable state.

Use the existing [kernel](src/kernel.ts), [draft boundary](src/draft.ts) and semantic mutation owners. Immer drafts must not escape the domain boundary. Preserve unchanged identity where caches/persistence depend on it; derived indexes are rebuildable, not a second authority. Do not deep-copy entire worlds for a local change.

Bundled mechanics, thresholds, content and authored YAML belong in `src/worlds/base/`; generated output follows its generator. Keep reusable operations separate from world policy and reuse the existing action/declaration path instead of adding a registry per feature.

For mechanics, read the [design skill](../../.agents/skills/openlegend-design/SKILL.md); for state/lifecycle changes read the relevant [save/load contract](../../docs/save-and-load.md). Observation/perception changes also use the AI or performance routes when applicable. Trace command, event, observation, cancellation and restoration consumers, not only the changed transition.
