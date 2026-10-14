# Halo 2 — intelligence and simulation dossier

| Field | State |
| --- | --- |
| Coverage | **Topic-only research:** behavior organization, attention, beliefs, memory allocation and legibility. Not full-game coverage. |
| Reviewed | 2026-10-14 |
| Edition | Halo 2 as described by its AI programmer in 2005; not a claim about later Halo games. |
| Inventory | Unnumbered scoped case. |

[Research ledger](../research-progress-intelligent-simulation-2026-10-14.md) · [NPC synthesis](../synthesis/characters-companions-and-relationships.md)

## Implementation evidence

Damian Isla describes a reusable hierarchical behavior graph. Common conditions can reject irrelevant behavior branches cheaply before more detailed checks. Event handlers can introduce a temporary candidate into ordinary arbitration, rather than directly commanding a reaction. The important separation is between receiving a stimulus and choosing what to do about it. [H1]

The article distinguishes shared behavior structure, temporary execution storage and persistent per-actor/per-target memories. Its perceived-object records can disagree with actual world state, enabling mistaken expectations. The author explicitly limits this representation: it is not a rich general model of space, relationships or every object. He also emphasizes avoiding rapid switching and making intentions intelligible to players. [H1]

**Source:** [H1: Damian Isla, *Handling Complexity in the Halo 2 AI*, GDC 2005 proceeding](https://www.gamedeveloper.com/programming/gdc-2005-proceeding-handling-complexity-in-the-i-halo-2-i-ai). Read the contiguous architecture sections from 'Core Combat Cycle' through 'Memory and Memory', plus the opening design goals and designer-control boundary. Developer technical evidence, not source-code execution or a new audience study.

## OpenLegend lesson: an event is not an order

The corresponding OpenLegend research hypothesis is that a notice should make a choice relevant without prescribing its outcome. Hearing that someone died may deserve attention; it should not make every person flee, mourn identically or abandon a promise. Generic event subscriptions can reduce polling while interpretation remains character-specific.

Shared immutable descriptions are another useful separation. Thousands of people may know the same mechanical method without sharing a private intention, belief or experience. Store the common description once; retain each person's progress, chosen limits and actual results separately. Sharing a method is not sharing a mind.

A larger branch count is not automatically more intelligence. For an open-ended character, the branch structure can become an unacknowledged ceiling on imaginable actions. Use it for trusted execution or clearly authored species behavior, not as a universal personality policy beneath an LLM.

## Hypothetical contrasting episode

Two guards hear the same noise while escorting an injured friend. Both should receive only permitted sensory evidence. One may investigate, one may stay, and one may ask the other to look. A cheap mechanism can deliver the notice and preserve the current escort activity while a decision is pending. It cannot infer that both have accepted a coordinated split before they communicate or act.

An evaluation should look for coherent continuation under distraction, justified changes, consistent limited knowledge and a visible outcome. More spoken explanations are not necessarily better: concise behavior and occasional relevant speech may be clearer than a monologue after every event.

## Alternatives, limits and unfinished broader coverage

For a fixed adversary, an authored behavior tree may be the right complete solution; free-form cognition can make combat less readable and much harder to test. OpenLegend's independent people have a different product goal. This does not mean all animals or all bodies need verbal goals.

The historical architecture does not establish exact modern Halo behavior, OpenLegend performance, long-term relationship quality or general reasoning. Combat balance, level design, campaign, multiplayer and broader reception were not researched for this dossier.
