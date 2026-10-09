# Domain

This subtree owns authoritative simulation. Keep I/O and orchestration outside it; preserve saved RNG, simulation-time semantics, phase order and serializable state.

Use the existing [kernel](src/kernel.ts), [draft boundary](src/draft.ts) and semantic mutation owners. Immer drafts must not escape the domain boundary. Preserve unchanged identity where caches/persistence depend on it; derived indexes are rebuildable, not a second authority. Do not deep-copy entire worlds for a local change.

Bundled mechanics, thresholds, content and authored YAML belong in `src/worlds/base/`; generated output follows its generator. Keep reusable operations separate from world policy and reuse the existing action/declaration path instead of adding a registry per feature.

For new mechanics or changed engine/world contracts, use [Design](../../.agents/skills/openlegend-design/SKILL.md); a local fix within an unchanged contract does not require a new design. State/lifecycle changes consult [save/load](../../docs/save-and-load.md). For sensory behavior, read the relevant [perception/reaction contract](../../docs/events-perception-and-reactions.md) and [spatial contract](../../docs/spatial-world.md); use AI guidance for additional cognition concerns. Apply the [root performance read requirement](../../AGENTS.md#performance-guidance-before-code-work) before code work, including local fixes. Trace affected command, event, observation, cancellation and restoration consumers, not only the changed transition.

Adding a saved reference is a lifecycle change even when its target's owner is unchanged. Read [Continuation and identity](../../docs/save-and-load.md#continuation-and-identity), and trace the target's permitted movement, custody and removal paths before requiring it to remain live forever.

For physical placement, attachments, support, reach or coverage, read the [physical-interaction design checks](../../docs/spatial-world.md#physical-interaction-design-checks) before planning or changing the mechanic. New passive processes, repeated entity/material scans and derived-cache changes also require [Performance](../../.agents/skills/openlegend-performance/SKILL.md) before implementation, even when no spatial source file changes.
