# Domain

This subtree owns authoritative simulation. Keep I/O and orchestration outside it; preserve saved RNG, simulation-time semantics, phase order and serializable state.

Use the existing [kernel](src/kernel.ts), [draft boundary](src/draft.ts) and semantic mutation owners. Immer drafts must not escape the domain boundary. Preserve unchanged identity where caches/persistence depend on it; derived indexes are rebuildable, not a second authority. Do not deep-copy entire worlds for a local change.

Bundled mechanics, thresholds, content and authored YAML belong in `src/worlds/base/`; generated output follows its generator. Keep reusable operations separate from world policy and reuse the existing action/declaration path instead of adding a registry per feature.

For new mechanics or changed engine/world contracts, use [Design](../../.agents/skills/openlegend-design/SKILL.md); a local fix within an unchanged contract does not require a new design. State/lifecycle changes consult [save/load](../../docs/save-and-load.md). For sensory behavior, read the relevant [perception/reaction contract](../../docs/events-perception-and-reactions.md) and [spatial contract](../../docs/spatial-world.md); use AI or performance guidance only for those additional concerns. Trace affected command, event, observation, cancellation and restoration consumers, not only the changed transition.
