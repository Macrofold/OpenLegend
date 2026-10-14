# Prom Week — social choice as a simulated interaction

| Field | State |
| --- | --- |
| Coverage | **Topic-only research:** reusable social rules, relationship-sensitive choice and consequential dialogue. |
| Reviewed | 2026-10-14 |
| Subject | Prom Week and its Comme il Faut system; 2011–2013 primary sources. |
| Access | Author project posts and primary paper abstracts; the full conference PDF was not retrieved. |
| Inventory | Unnumbered scoped case; not a full-game completion claim. |

[Research ledger](../research-progress-intelligent-simulation-2026-10-14.md) · [NPC guide](../synthesis/characters-companions-and-relationships.md)

## What the sources establish

The 2011 CiF paper describes reusable, recombinable representations of social norms and exchanges to reduce the otherwise combinatorial authoring burden. Its abstract establishes the approach, not every internal scoring or history implementation. [P1]

The creators' social-exchange explanation is more concrete: a character has context-dependent desires to initiate exchanges; the responder separately accepts or rejects the intended social change. A suitable templated scene then represents the interaction. Their example makes a rumor's reception depend on existing relationships. This is structured authored social reasoning, not unrestricted language understanding. [P2]

- [P1: McCoy et al., *Comme il Faut: A System for Authoring Playable Social Models*, AIIDE 2011](https://ojs.aaai.org/index.php/AIIDE/article/view/12454), primary abstract and publication information inspected; full PDF access failed.
- [P2: Project authors, *Prom Week's Social Exchanges*, 2012-02-22](https://promweek.soe.ucsc.edu/2012/02/22/prom-weeks-social-exchanges/), substantive indexed article body inspected; direct fetch returned an error.
- [P3: Project authors, *Gameplay and Social Physics*, 2011-11-12](https://promweek.soe.ucsc.edu/2011/11/12/gameplay-and-social-physics/), author explanation of intended contrast with fixed dialogue trees.
- [P4: McCoy et al., *Prom Week*, AIIDE 2013](https://ojs.aaai.org/index.php/AIIDE/article/view/12662), playable-experience abstract; not a second independent validation study.

## Transfer: social consequences need their own decision boundaries

A language model can write a convincing compliment without anyone liking it. OpenLegend should preserve a difference between choosing to speak, another person hearing, interpreting and believing the message, and a resulting relationship change. The recipient's personality and history matter at the recipient's choice, not merely as decoration in the speaker's prompt.

Reusable interaction structure can make these boundaries cheap. A shared conversation situation can identify who is present, what was said and which responses are possible. It should not mechanically require a specific feeling or force both people through a predetermined emotional outcome.

A hypothetical rumor illustrates the point. A person repeats a claim about a friend. The listener may reject it because they trust the friend, believe it because of previous evidence, or suspend judgment. A cheap factual record can preserve the statement and source. Generative interpretation is valuable when the meaning or conflict with prior knowledge is ambiguous. The eventual belief is not an engine-certified fact.

## Authoring burden is displaced, not eliminated

Rules are useful when the world intentionally supports a stable convention. They become a burden when every exception requires another special case. LLMs offer broader interpretation but bring latency, consistency and grounding costs. A hybrid should use structured mechanics for actual transfers, invitations, commitments and outcomes, while leaving meaning and preference open where appropriate.

The alternative is a more modest social game with a deliberately finite set of exchanges. That can be clearer and more testable than open-ended conversation. OpenLegend's broader ambition does not make the finite approach bad; it means the finite vocabulary should not secretly become the ceiling on every character's imagination.

## Evaluation and limits

Test whether a recipient can refuse, misunderstand or change their mind for reasons consistent with permitted evidence. Check whether later behavior reflects the interaction, and whether the same action can produce different responses for different people. Do not measure depth by the number of dialogue variants alone.

This pass does not establish current source-code behavior, exact rule counts, runtime complexity, population scale or comprehensive player reception. Those remain outside the explicitly bounded source scope.
