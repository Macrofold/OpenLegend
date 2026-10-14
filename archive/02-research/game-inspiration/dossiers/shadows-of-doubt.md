# Shadows of Doubt — persistent citizens and the limits of precomputed routine

| Field | State |
| --- | --- |
| Coverage | **Topic-only research:** citizen routines, reactive change, update frequency and causal evidence. |
| Reviewed | 2026-10-14 |
| Inventory | G159, previously queued; this supplies a scoped source, not a full R01–R15 dossier. |
| Version boundary | Historical 2018–2020 development accounts; not an audit of the latest released controller. |

[Research ledger](../research-progress-intelligent-simulation-2026-10-14.md) · [NPC guide](../synthesis/characters-companions-and-relationships.md)

## A useful documented reversal

In September 2018, Cole Jefferies described precomputing citizens' daily activities before the day began, then recalculating deviations as needed. That was an explicit performance strategy for hundreds of citizens, not a general claim that complete daily planning is always optimal. [S1]

By April 2019, he described replacing the largely precomputed routine with a goal-based system and needs-driven minor activity. Spontaneous reactions had required separate handling and could break the old routine. The newer design varied AI update frequency with player proximity and activity requirements to reduce the cost of most citizens. The post's wording about exactly when awareness increases is awkward; it does not justify an invented precise scheduling formula. [S2]

A 2020 video-introduction post explains the goal of giving generated personalities consequences beyond window dressing, but the video itself was not inspected. It is not evidence for the detailed generation algorithm. [S3]

- [S1: Developer, *DevBlog 8: Simulating a City*, 2018-09-15](https://colepowered.com/shadows-of-doubt-devblog-8-simulating-a-city/), substantive text inspected.
- [S2: Developer, *DevBlog 15: Moving in the Citizens*, 2019-04-24](https://colepowered.com/shadows-of-doubt-devblog-15-moving-in-the-citizens/), full substantive text inspected.
- [S3: Developer, *DevBlog 23: Generating Citizens*, 2020-10-24](https://colepowered.com/shadows-of-doubt-devblog-23-generating-citizens-video/), surrounding text only; no transcript or watched-footage claim.

## Transfer: choose a useful horizon, not the longest possible one

OpenLegend can benefit from decisions that last longer than one action. This history is counterevidence to assuming the best answer is to have an LLM write every person's whole day. Long plans become expensive to repair when people interact, obstacles change, or an unexpected opportunity matters.

A bounded next portion is often enough: prepare the ingredients, walk to a chosen meeting place, or finish one repair stage. Preserve the larger intention, but let uncertain future details remain uncertain. This reduces both generated text and the number of invalid assumptions that must be maintained.

A hypothetical shopkeeper may choose to open the shop, prepare stock and serve visitors. A customer arriving early should not require reconstructing the whole day. A serious accusation from an old friend may require reconsidering more than the next work step. The system needs both local repair and genuinely open-ended reinterpretation.

## Transfer: low update frequency is a contract, not a disappearance trick

A person far from the player can need less movement detail while remaining the owner of a route, possessions, relationships and future consequences. If another person interacts with them, or their activity has an immediate consequence elsewhere, distance alone is a poor reason to postpone the effect.

The proposal for OpenLegend is therefore to consider interaction relevance and causal deadlines alongside visibility. A world with multiple observers makes a single player-distance rule even less adequate. Keep rendering, physical progression, social interactions and model deliberation as separate budgets.

## Causal traces matter especially in an investigative world

Our inference from the detective premise is that shortcuts must preserve evidence. A receipt, sighting or recollection is useful only if it corresponds to what the simulation actually represented. Generating a plausible biography on demand cannot safely substitute for a record that another player may already have investigated.

A hypothetical witness might truthfully report seeing a person enter a building without knowing what occurred inside. The engine may hold the fuller event history, but the witness should not gain it merely because it makes the mystery easier to narrate. This is an OpenLegend application, not a verified description of every shipped Shadows of Doubt evidence subsystem.

## Limits and broader progress

The research establishes a concrete architecture iteration and its stated tradeoffs. It does not establish current frame costs, exact maximum population, all crime-generation mechanics or a benchmark of apparent intelligence. General mechanics, reception, edition history and the rest of the full-game assignment remain unresearched here; G159 must remain explicitly topic-only in the inventory.
