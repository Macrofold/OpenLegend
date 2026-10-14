# Left 4 Dead — intelligence and simulation dossier

| Field | State |
| --- | --- |
| Coverage | **Topic-only research:** interruption, resumable work, layered AI and encounter pacing. Not a full-game dossier. |
| Reviewed | 2026-10-14 |
| Edition | Original Left 4 Dead; Valve's 2009 technical presentation. |
| Inventory | Unnumbered scoped case. |

[Research ledger](../research-progress-intelligent-simulation-2026-10-14.md) · [NPC synthesis](../synthesis/characters-companions-and-relationships.md)

## Source-grounded mechanism

Mike Booth separates locomotion, body/animation, vision and intentional behavior. Actions can continue, replace themselves, suspend for another activity, or finish and resume suspended work. Transitions carry reasons. Events are considered through the active action hierarchy, allowing local handling before broader reactions. This supplies an explicit model of interruption without restarting the entire character. [L1]

The same presentation describes a separate director for population and dramatic pacing. Its active-area and intensity systems serve a cooperative encounter experience. The director's knowledge and authority should not be mistaken for an individual enemy's perception or for persistent civilian life. [L1]

**Source:** [L1: Michael Booth, *The AI Systems of Left 4 Dead*, Valve 2009](https://steamcdn-a.akamaihd.net/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf). Relevant architecture text on PDF pp. 38–44 and pacing/population sections; transition and event-propagation diagrams inspected on PDF pp. 40 and 42. This pass did not watch every embedded demonstration or reproduce the system.

## Transfer: preserve the interrupted purpose and actual progress

For OpenLegend, the valuable question is not whether an NPC has a stack. It is whether a person can set work aside, respond to something, and later decide whether resuming still makes sense. Native work already consumed should remain consumed. A changed goal cannot rewrite completed effects. Nor should finishing an interruption automatically restore an obsolete intention.

A useful episode would have a person pause preparing a meal to answer a question, then continue only if the food, place, company and intention still fit. The cheap part is maintaining the work and its dependencies. The expensive part is deciding whether the question changes what the person now wants. This is a research example, not a new runtime contract.

The alternatives are significant. A simple one-step task can just fail and report why; implementing a universal suspension stack for every action may add needless complexity. Some physical activities cannot be safely resumed. Some social opportunities expire while interrupted. The action's actual semantics must decide what survives, not a generic stack operation alone.

## Transfer limit: director versus authored reality

A director can be an optional world-authoring mechanism for a deliberately paced scenario. It should not silently rewrite OpenLegend's historical people or create dangers whenever the player becomes comfortable. The difference is not cosmetic: a stable achievement, peaceful gathering or quiet life can remain achieved.

Changing the density of anonymous encounters is also not equivalent to lowering the detail of a persistent individual. A named person's promises, possessions and causal interactions need continuity even when unobserved. Rendering fewer figures and running less cognition are separate decisions.

## Evidence gaps

The source establishes design and architecture, not that these choices optimize every genre. No modern build profiling, player study or OpenLegend measurement was performed. Campaign structure, weapons, monetization, franchise evolution and general reception remain outside this topic-only dossier.
