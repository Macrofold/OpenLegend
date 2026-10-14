# Versu — social practices, bounded autonomy and efficient deliberation

| Field | State |
| --- | --- |
| Coverage | **Topic-only research:** social intelligence, action choice, limited lookahead, beliefs and authoring burden. Not full-game research. |
| Reviewed | 2026-10-14 |
| Subject | Versu's author-described architecture; not the unrelated current e-commerce company with a similar name. |
| Inventory | Unnumbered scoped case; no existing G number reassigned. |

[Research ledger](../research-progress-intelligent-simulation-2026-10-14.md) · [NPC guide](../synthesis/characters-companions-and-relationships.md)

## Architecture evidence and its limits

The author-hosted manuscript describes social practices that provide role-dependent opportunities; agents select among them rather than a practice prescribing every next act. Action evaluation uses utility and short lookahead. Reversible primitive effects let simulated outcomes be undone without copying the whole world. Relationships have asymmetric evaluative dimensions and reasons. The system also includes a drama manager that can sometimes influence choices, so 'strong autonomy' is not an absolute no-intervention guarantee. [V1]

A particularly consequential optimization appears in the beliefs section: most agents share world information, with explicit exceptions for selected false beliefs. This is cheaper than separate comprehensive subjective worlds, but it is **not** a general limited-knowledge architecture. The manuscript also describes deliberately simple emotion treatment. [V1]

[V1: Richard Evans and Emily Short, *The AI Architecture of Versu*, author-hosted manuscript](https://versu.com/wp-content/uploads/2014/05/versu.pdf). Sections 1–2, 7–8 and 12 were inspected, including the action/utility, reversible-lookahead and beliefs discussions; relevant PDF pages were also viewed as images. This pass did not execute the engine or certify every claim against a released game. This manuscript and later published papers are related sources, not automatically identical revisions.

## Why it matters to OpenLegend

This is a useful middle position between a fixed dialogue tree and a model inventing an entire social world on each turn. A greeting, meal, dispute or performance can make certain acts intelligible because the participants recognize a shared situation. Each person can still respond differently.

Our inference is that an OpenLegend activity should offer structured opportunities without owning the participant's will. An invitation creates an opportunity to accept or decline; it does not reserve another person as an animation component. An accusation creates information and possible reactions; it does not establish guilt, agreement or hostility automatically.

Social rules must also retain an author. A world, institution or character can have expectations about hospitality, rank or obligations. The engine should not universalize one culture's norms or a utility function's preferred behavior. A character can notice a norm and knowingly refuse it. The cost of refusal can be simulated without converting social pressure into metaphysical impossibility.

## What the efficient lookahead does and does not solve

Trying a few alternatives against a cheap local model may be useful for tactical means, resource use or a known interaction. It is not a proof that the predicted future will happen. Another actor's response, new evidence and the passage of time can invalidate a projection.

For OpenLegend, any future lookahead should distinguish hypothetical effects from committed effects. A trial trade must not transfer the item; a predicted refusal must not become a memory that the other person actually refused. Reusing the same underlying action semantics can reduce divergence, but authorization, randomness and side effects still need explicit isolation. No such implementation is approved here.

The simpler alternative is a selected short sequence plus native validation, without speculative search. Lookahead is worthwhile only if it improves important choices enough to justify its preparation cost and additional failure surfaces. Avoid using it merely because a paper contains a planner.

## A hypothetical social episode

A host invites two people to supper. One guest has promised to leave early; the other dislikes a proposed topic of conversation. The shared gathering can provide eating, speaking, listening and leaving opportunities. Their personal commitments influence choices, while the actual meal, speech and departure remain distinct events. A host's belief that everyone enjoyed the evening can be wrong.

Later, one guest remembers a hurtful remark. The relevant memory should come from what that person heard, not the shared omniscient record. This is where importing Versu's shared-world shortcut would directly violate OpenLegend's intended evidence boundary.

A useful evaluation would compare ordinary participation, polite refusal, disruptive interruption, mistaken belief and a satisfying quiet conclusion. Success is not everyone conforming to the most socially approved script. It is coherent, legible agency with consequences.

## Evidence gaps and broader scope

The architecture is a strong source for reusable social structure and bounded computation, not proof of modern LLM economics, massive populations or human-like psychological validity. Full commercial history, all released stories, player reception and complete authoring tools remain outside this topic-only dossier.
