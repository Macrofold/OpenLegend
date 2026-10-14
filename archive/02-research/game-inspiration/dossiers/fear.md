# F.E.A.R. — intelligence and simulation dossier

| Field | State |
| --- | --- |
| Coverage | **Topic-only research:** NPC planning, interruption, coordination and perceived intelligence. Not a full-game dossier. |
| Reviewed | 2026-10-14 |
| Edition | Original F.E.A.R.; Jeff Orkin's GDC 2006 implementation account. No claim about sequels or current remasters. |
| Inventory | Unnumbered scoped case; existing G identifiers are unchanged. |

[Research ledger](../research-progress-intelligent-simulation-2026-10-14.md) · [NPC synthesis](../synthesis/characters-companions-and-relationships.md)

## What the implementation establishes

Orkin describes planning over authored goals, action prerequisites, effects and costs, with a small separate execution state machine. Failure can update working knowledge and cause a different action sequence. The paper's blocked-door example ends with a different route and attack, rather than a developer-written transition for that exact combination. The planner narrows its represented problem; it does not reason over arbitrary world facts. Squad coordination is a separate, more ad-hoc layer, not the same planner scaled to a group. [F1]

The paper also supplies a unusually important counterexample to treating appearances as mechanisms: soldiers can call for reinforcements without an implemented reinforcement-request system. Spoken exchanges help players interpret already-selected coordination. This is evidence for intentional presentation design, not for language causing the action or for agents understanding that language. [F1]

**Source inspected:** [F1: Orkin, *Three States and a Plan: The A.I. of F.E.A.R.*, GDC 2006](https://www.gamedevs.org/uploads/three-states-plan-ai-of-fear.pdf), especially printed pp. 2–4, 10–13 and 15–16. Relevant PDF diagrams/pages were inspected as images as well as text. The [official session record](https://gdcvault.com/play/1013282/Three-States-and-a-Plan) establishes the presentation identity. This is a developer-authored technical account, not our execution benchmark.

## How intelligent, and what remains authored?

The useful category is **bounded online problem-solving**. A developer supplies the language in which a problem can be expressed; searching that language can produce an unanticipated sequence. Neither 'every transition is scripted' nor 'the NPC understands anything' is an adequate description.

For OpenLegend, separate two questions: can an actor find another permitted means to a selected purpose, and should that purpose still matter? A symbolic planner may help with the first without taking over the second. A destructive shortcut may be mechanically possible and cheap while violating the character's intention. Action cost cannot quietly stand in for personal meaning.

## Transfer experiment — hypothetical, not existing gameplay

A person has chosen to repair a roof using designated supplies. A blocked passage should not require rediscovering the purpose of the repair. A bounded planner could search another known route or another already-allowed arrangement of the same work. If the only alternative consumes someone else's keepsake, the old authorization is insufficient. The character needs a new choice, even though the abstract goal remains achievable.

Compare native continuation, a bounded planner and another model call on this episode. Observe whether each preserves the chosen restrictions, reports failure, stops after success and avoids retry loops. Measure total preparation and execution cost, not just planner search time. No experiment was run in this research pass.

## What not to copy

Do not copy decorative causal claims. OpenLegend may allow a character to lie or speculate, but its historical records must distinguish a shouted request, whether anyone heard it, their response and actual arrival. A convincing shout cannot create a rescue receipt.

Do not turn every life question into a planning predicate. The cost of authoring action descriptions and maintaining valid effects can exceed the value for rare, ambiguous choices. A short chosen sequence is the simpler alternative. Broader cognition should remain available when the represented action vocabulary is inadequate.

## Evidence limits and outstanding broader coverage

The account is historical and task-specific. It supplies no OpenLegend population, latency or cost benchmark. This pass did not audit shipped binaries, player reception, the entire campaign, progression, economy or franchise history. Those full-game dimensions remain unresearched here.
