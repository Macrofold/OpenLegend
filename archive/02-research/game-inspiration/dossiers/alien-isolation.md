# Alien: Isolation — perceived intelligence and the information boundary

| Field | State |
| --- | --- |
| Coverage | **Topic-only, bounded evidence:** sensory threat, presentation and the distinction between perceived intelligence and implementation. |
| Reviewed | 2026-10-14 |
| Edition | Original Alien: Isolation; Creative Assembly's 2015 design presentation. |
| Access | Official session overview only; complete talk and proprietary AI code not inspected. |
| Inventory | Unnumbered scoped case; not a full-game dossier. |

[Research ledger](../research-progress-intelligent-simulation-2026-10-14.md) · [NPC guide](../synthesis/characters-companions-and-relationships.md)

## What the primary evidence supports

Alistair Hope's official GDC description frames the goal as making one creature a meaningful threat to an underprepared player. It identifies the creature's senses and the visual/aural environment as central to that experience. It does not disclose the full director, behavior-tree or adaptation implementation. [A1]

[A1: Creative Assembly, *Building Fear in Alien: Isolation*, GDC 2015](https://www.gdcvault.com/play/1021852/Building-Fear-in-Aliens), official overview inspected. Common secondary accounts of a two-brain director or progressively unlocked behavior branches are **not freshly verified implementation evidence in this dossier**.

## The useful research question

A threatening pursuer may feel intelligent because the player can infer that it heard something, investigate a plausible cause, and attempt a countermeasure. More accurate pursuit is not automatically a better experience if it makes concealment meaningless. Conversely, arbitrary ignorance can make the system feel fake.

For OpenLegend, distinguish the world's knowledge, the scheduler's knowledge, the character's permitted perception and what the player can see. An efficient background system may know that two routes intersect without telling either traveler the other's private destination. A presentation cue may communicate attention without granting the actor extra information.

## What to compare rather than copy

A hypothetical pursuer loses sight of a character. Compare a simple last-known-position search, a more expensive model-driven search and an omniscient shortcut. The omniscient version may win more often but violates the intended information game. Evaluate whether the pursuer responds to actual evidence and whether a player can understand enough to act—not merely whether pursuit succeeds.

A deliberately paced horror scenario may choose a director that regulates pressure. An authored reality promising independent lives may choose not to. The director's role should be explicit in the world contract, rather than disguised as an NPC's personal motivation.

## Limits and status

This case is incorporated as a **bounded design-intent comparison**, not as a reverse-engineered algorithm. Full technical source access would be needed before drawing precise conclusions about scheduling, learning, memory or the interaction between director and creature. No sequel claims, source-code inspection, player study or performance benchmark are included.
