# Additional evidence and verification boundaries

**October 14, 2026 · Research only.** Companion to the [NPC synthesis](../synthesis/characters-companions-and-relationships.md), [simulation architecture study](efficient-individual-simulation.md) and [pass inventory](../research-progress-intelligent-simulation-2026-10-14.md).

<a id="hybrid-combat-study"></a>
## A hybrid combat controller improves some encounters and worsens another

Nair and Karim's August 27, 2026 preprint tests five Unity NPCs with a shared trained PPO policy. A local Mistral 7B model selects among four tactical tags every five seconds. In 600 episodes against three scripted opponent types, adding the model improved the win rate against the Balanced opponent from 11% to 24%, but its strong preference for encirclement was counterproductive against the Aggressive opponent. Surround accounted for 83.8% of 2,430 strategy selections. The Evasive comparison improved some outcomes without meeting the study's strict hypothesis definition. These are the authors' reported results, not a reproduced experiment. Only the primary abstract and metadata were verified for this incorporation. [V1]

**Our interpretation:** a layered controller is a design opportunity, not an automatic quality improvement. A system can make fewer high-level choices and still make the wrong kind of choice repeatedly. The performance of one opponent class can hide another class's failure. A fixed five-second interval in a small combat experiment does not establish an appropriate cognition interval for independently living people.

For OpenLegend, compare a hybrid with the existing controller and a credible simpler alternative. Evaluate personally meaningful cases separately from mechanical task success. Choosing whether to accept surrender or preserve an ally is not the same task as selecting a formation. A useful future experiment would retain permitted knowledge and actual action semantics while changing the decision policy; it would count preparation and inference cost as well as successful outcomes. No such experiment was run here.

## Source version and interpretation checks

The study set distinguishes original architecture from current releases, prototypes from shipped systems, talk abstracts from watched presentations, and population predictions from interactive gameplay. In particular, the Shadows of Doubt routine account concerns a 2018 prototype; the current Songs of Syx citizen controller was not inspected; and the previously referenced RimWorld community decompilation was unavailable in this pass. Those limits are retained in the relevant dossiers and supplement rather than filled with guessed implementation details.

For metareasoning, the primary proceedings title is *Selecting Computations: Theory and Applications* (Hay and colleagues, 2012). The current arXiv revision at `2410.05563v3` is *Rational Metareasoning for Large Language Models* (De Sabbata, Sumers, AlKhamissi, Bosselut and Griffiths; June 23, 2025 revision of the 2024 submission). Its token-saving result concerns its evaluated language tasks, not a qualified NPC routing policy. The architecture study's source register uses those identifiers. [V2, V3]

These distinctions are consequential: neither a modern publication date nor fluent explanation makes a result transferable without examining the task, evidence, baseline and failure cases. A primary source can establish what its authors reported without independently establishing that the result will reproduce in OpenLegend.

## Sources

- **V1:** Hrithika Deepu Nair and Kayvan Karim, [LLM-Guided Reinforcement Learning for Adaptive NPC Behavior in Multi-Agent Combat Games, v1](https://arxiv.org/abs/2609.02931v1). Submitted August 27, 2026; abstract and metadata inspected October 14. No commercial-game implementation or player study is inferred.
- **V2:** Hay et al., [Selecting Computations: Theory and Applications](https://proceedings.mlr.press/r10/hay12a.html), UAI 2012 proceedings; bibliographic metadata and abstract verified.
- **V3:** De Sabbata et al., [Rational Metareasoning for Large Language Models, v3](https://arxiv.org/abs/2410.05563v3), June 2025 revision; bibliographic metadata and abstract verified.

No game execution, model training, paid inference, performance benchmark or runtime qualification was performed for this research pass. Structural checks of research records are not behavioral tests.
