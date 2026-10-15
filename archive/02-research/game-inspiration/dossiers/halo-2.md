# Halo 2 — bounded behavior, individual knowledge and the cost of representation

**Coverage: AI implementation and perceived intelligence only. Reviewed October 14, 2026.** Not a full-game dossier. The evidence is Damian Isla's account of the shipped Halo 2 architecture, published in March 2005, not a claim about later Halo games.

[Topic synthesis](../synthesis/characters-companions-and-relationships.md) · [F.E.A.R.](fear.md) · [Left 4 Dead](left-4-dead.md)

## Primary implementation evidence

Isla describes a reusable behavior graph with prioritized, sequential, looping, probabilistic and one-off selection. Explicit impulses can redirect behavior; common eligibility conditions are encoded in tags before more expensive relevance checks. He identifies rapid switching between activities and unreadable behavior as costs of complexity. [H1, “Behavior” through “Behavior Tagging”]

The graph is shared while transient execution memory is allocated to active behavior depth. His illustrative comparison reduces roughly 192 KB to 25 KB for 100 actors. Persistent experience is stored separately, including target-specific search or path failures. Perceived-object records can differ from actual world facts, supporting mistakes and surprise rather than omniscience. These are historical architecture figures, not modern NPC throughput measurements. [H1, “Memory and Memory”]

## A useful distinction: shared ability, personal experience

OpenLegend can reuse a method without making its users interchangeable. The definition of how a known method works can be shared; the person's current progress, permission, selected materials, failures, interpretation and reason for doing it cannot simply become shared mutable state.

This principle applies beyond behavior trees. Repeating a large immutable action description in every character record is different from retaining the character's own history of using that action. Likewise, an embedding index is not the memory itself, and a cached route is not evidence that the character has personally traveled it.

### Two kinds of forgetting

It can be safe to discard temporary execution bookkeeping after an activity finishes. It can be damaging to discard the experience that should affect a later decision. Conversely, retaining every intermediate movement forever can obscure the few outcomes that matter.

**Hypothetical example:** a character unsuccessfully searches a particular cupboard, then speaks to someone. Clearing the search's temporary execution state should not erase the discovery that the cupboard was empty. But it should not suppress searching a different cupboard, nor establish that the first will remain empty indefinitely. Relevant identity, observation time and the scope of failure are part of the evidence.

This is a useful challenge for both native caches and language-model summaries: “search failed” without its target and circumstances is cheap but often unusable.

## Optimization without choosing the character's values

Filtering physically impossible or unauthorized operations can avoid expensive evaluation. Filtering out an unusual but possible action merely because a generic utility rule rates it poorly is a different intervention. The first narrows execution correctly; the second may remove an expression of the character's identity.

Similarly, preserving an ongoing intention can avoid repetitive reconsideration. A blanket rule preventing changes for a fixed interval can also hide a betrayal, an urgent request or a newly meaningful observation. The research question is which supporting assumptions remain valid, not just how long the current activity has run.

An alternative to a large behavior hierarchy is a smaller collection of reusable activities selected by cognition. The tradeoff is fewer authored selection rules but more responsibility on the decision context, candidate preparation and interruption policy. A planner is another alternative where composing known mechanical means actually helps.

## Perception and legibility

Limited knowledge is not merely a difficulty setting. It makes searching, deception, explanation and later learning coherent. A character should react to what was perceived or communicated, not to a globally correct object record presented as personal knowledge.

Readable movement, attention and follow-through may let players infer an intention without constant generated narration. That is a transfer hypothesis, not a measured causal result from this source. The useful evaluation separates whether the character made a coherent decision, whether the player could understand it, and whether the explanation disclosed information the character did not have.

## Source and limits

**H1.** Damian Isla, Bungie, *GDC 2005 Proceeding: Handling Complexity in the Halo 2 AI*, March 11, 2005. [Developer-authored proceedings](https://www.gamedeveloper.com/programming/gdc-2005-proceeding-handling-complexity-in-the-i-halo-2-i-ai). Read the introduction, selection, impulses, tagging and memory sections. No game execution, current source audit or controlled player study was performed.

This topic-only addition does not claim reception, economy, full content, multiplayer or modding coverage, and does not authorize an OpenLegend behavior-tree rewrite.
