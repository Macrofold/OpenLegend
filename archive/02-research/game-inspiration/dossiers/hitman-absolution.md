# Hitman: Absolution — intelligence and simulation dossier

| Field | State |
| --- | --- |
| Coverage | **Topic-only research:** crowds, layered NPC control and locomotion. Not full-game research. |
| Reviewed | 2026-10-14 |
| Edition | Absolution; 2012–2013 developer presentations. Do not project these facts onto the World of Assassination trilogy. |
| Evidence depth | Official presentation descriptions inspected; complete talks/source code were not inspected. |
| Inventory | Unnumbered scoped case. |

[Research ledger](../research-progress-intelligent-simulation-2026-10-14.md) · [NPC synthesis](../synthesis/characters-companions-and-relationships.md)

## What can actually be claimed

IO's crowd presentation reports a production target of 1,200 interactable crowd characters at 30 frames per second on then-current consoles. That describes a particular crowd implementation and workload, not 1,200 independently deliberating social agents. [HIT1]

A separate developer presentation describes layered software supporting transitions among ordinary behavior, social stealth, action stealth and combat. Its overview establishes the problem and division into layers, but is not enough to reconstruct detailed scheduling or memory code. [HIT2]

A third presentation concerns reinforcement learning for crowd locomotion: selecting animation clips from high-level movement goals instead of manually managing every blend. This is a narrow learned motor-control component, not evidence that the game learns personalities or strategic goals. [HIT3]

## Sources and access labels

- [HIT1: Kasper Fauerby, *Crowds in Hitman: Absolution*, GDC 2012](https://www.gdcvault.com/play/1015315/Crowds-in-Hitman): official overview and stated workload; benchmark not independently reproduced.
- [HIT2: Maurizio De Pascale and Mika Vehkala, *Creating the AI for the Living, Breathing World of Hitman: Absolution*, GDC 2013](https://gdcvault.com/play/1019019/Creating-the-AI-for-the): official overview only.
- [HIT3: Michael Buttner, *Reinforcement Learning Based Character Locomotion in Hitman: Absolution*, GDC 2013](https://www.gdcvault.com/play/1018827/Reinforcement-Learning-Based-Character-Locomotion): official overview only.

## OpenLegend inference: separate kinds of fidelity

A crowd can be visually and physically convincing without supporting the same choices as a companion. That is useful if the game promises an anonymous crowd. It is a risk if the product promises that any apparently individual person has a continuing life.

For OpenLegend, compare several independent dimensions: visual detail, movement/collision accuracy, bodily processes, economic participation, social knowledge, memory, and frequency of deliberation. Reducing one need not reduce all. A person walking along a chosen route can need fewer decisions while still remaining a real owner of possessions and commitments.

Likewise, narrow learned controllers can be appropriate below a mind. Learning to choose a walking animation does not require giving that controller authority to decide whom to approach. A future model trained to execute familiar actions must retain the same authority boundary.

## Hypothetical test and failure mode

Populate a gathering with persistent individuals, then interrupt one with a personally consequential request. Test whether they respond as the same person rather than being replaced by a freshly generated 'important NPC'. Check their possessions, prior conversation and unfinished work. Separately measure movement/rendering cost. A high visible-character count alone cannot pass this test.

The strongest unresolved evidence is the full implementation material behind these talks. This dossier deliberately does not invent crowd update rates, detailed perception models or current trilogy behavior from summaries. The game remains unresearched here outside this topic.
