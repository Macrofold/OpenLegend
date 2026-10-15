# Creatures (1996) — a learned controller can still execute authored abilities

**Coverage: learning, embodiment and individual simulation only. Reviewed October 14, 2026.** This topic-only dossier concerns the original Creatures and its 1997 architecture paper. It does not complete the separately queued Creatures 3 or Creatures Docking Station dossiers, and does not transfer original implementation details to those later games.

[Main NPC guide](../synthesis/characters-companions-and-relationships.md) · [Alien: Isolation comparison](alien-isolation.md)

## The primary architectural evidence

Grand, Cliff and Malhotra describe genetically specified bodies, simulated biochemistry and neural systems with adaptation through reinforcement. The winning action activates a predefined behavior script. Perception is simplified rather than reconstructed from rendered pixels, and attention restricts available input. The paper reports up to about ten active creatures on typical target machines before substantial response degradation; distributed sales do not mean millions of creatures in one running world. The authors also identify the limitations of the behavioral model. [C1]

This is a valuable counterexample to equating all pre-LLM game AI with fixed behavior trees. Some parameters and associations really can change through experience. Yet learned selection does not eliminate authored sensors, action definitions, environment rules, reward mechanisms or execution code.

## What it means for OpenLegend

The strongest transfer is the separation of **a person or creature's learned selection** from **the world's supported actions**. A model can change which ability it uses without acquiring the authority to change that ability's effects. The same applies to an LLM or Decision API: a proposal and its success are different records.

A body also provides more than decorative context. Fatigue, injury, sensation and access to objects can influence which choices are possible and what consequences follow. However, one universal scalar reward is not an adequate assumed model for every authored person. A character may choose discomfort for a promise, care about someone else's well-being, or enjoy an activity with no productivity benefit.

### Hypothetical familiarization

An individual initially avoids an unfamiliar object, then experiences several harmless encounters. Their later behavior may change. The useful evidence includes what was actually perceived and what happened, not just a new numerical comfort value detached from its cause.

A transferable learned association should remain appropriately scoped. Learning that one person handled a tool safely is not evidence that every similar person is safe, nor that the tool cannot cause harm. The right degree of generalization is a research question. A cached rule that generalizes too broadly can be cheaper precisely because it discards the differences that matter.

### Teaching is more than installing behavior

A demonstrated method could become available for later selection, but observation, understanding, physical capability and permission are different prerequisites. The character still decides whether to use what they learned. Rewarding every successful demonstration with unconditional repetition would erase that distinction.

For OpenLegend, reusing a known method is a promising way to amortize expensive reasoning. Training a whole new low-level controller may be justified only if existing native execution cannot provide the desired competence. It brings data, debugging and generalization costs rather than automatically replacing them with intelligence.

## Perceived life and evidence limits

A continuing body whose behavior changes because of experience can invite attachment without fluent language. That is an inference relevant to our evaluation design, not a claim that the cited system proves consciousness or that players uniformly interpreted it this way.

Test competence, individuality, persistence and legibility separately. An agent can learn a task while remaining hard to understand; a highly expressive body can look intentional while failing to use relevant evidence. Poor outcomes can reflect a sensor or action limitation rather than a failure of the learning algorithm.

## Source

**C1.** Stephen Grand, Dave Cliff and Anil Malhotra, *Creatures: Artificial Life Autonomous Software Agents for Home Entertainment*, Agents '97, DOI `10.1145/267658.267663`. [Archived author manuscript](https://eem.foo/ccarchive/Sites/fp.cyberlifersrch.plus.com/articles/agents_'97_paper.htm). Architecture, perception, neural control, biochemistry, genetics and limitations were reviewed in the preserved HTML. It is an author manuscript hosted in a preservation archive, not an audited current distribution.

No game run, new training experiment, current performance measurement or full-game research completion is claimed. This study does not authorize a neural-controller rewrite or a universal reward model.
