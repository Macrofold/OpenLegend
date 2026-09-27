# Garry's Mod: tools, constraints, and player-made games

**Gameplay inspiration; researched September 25, 2026.** This extends the [Garry's Mod chapter](../games/garry-s-mod.md), preserving earlier reviews, videos, and conclusions. It distinguishes the base sandbox, community modes, server conventions, and developer APIs. No new game session or code experiment was performed. This is not an instruction to reproduce Garry's Mod's architecture or a new OpenLegend task list.

## 1. A manipulation tool makes objects available for thought

The official Physgun guide describes moving, rotating, freezing, and releasing props. Rotation can snap to an angle, while freezing holds a selected object in place during construction. Those are editing capabilities rather than the ordinary physical limitations of an embodied person. [G1]

**Interpretation:** a useful creative tool removes incidental difficulty from expressing a spatial idea. Holding a beam in place while attaching another component is not necessarily the interesting problem. Deciding what arrangement should exist can be.

This also makes the distinction between authoring and playing unusually visible. The creator can suspend a physical object while designing; the finished device can then operate under the selected physical relationships. A game need not make both activities obey identical constraints to preserve meaningful construction.

For natural-language authoring, the analogous question is which labor the assistant should remove. Translating a chosen arrangement into precise placement may preserve authorship. Silently choosing the complete purpose, solution, and tradeoffs may remove it. The two can share a tool without being the same experience.

## 2. Relationships among parts create behavior

The Axis tool connects two props around a common axis. Its settings include friction, breakable force/torque limits, and whether the connected props collide. The developer-facing weld API exposes a different relationship, joining two physical objects with configurable limits and collision behavior. These are documented supported constraints, not an exhaustive physics model. [G2] [G3]

**Worked comparison:** attaching a panel with a weld and attaching it with an axis do not create the same object in play. One fixes the relationship; the other allows a chosen kind of motion. The visible meshes could be identical while their useful behavior differs. This is an illustration of the documented contracts, not a tested construction from this research.

**Interpretation:** a reusable mechanic may be a relationship rather than a thing. A hinge, connection, constraint, or trigger can have more combinatorial value than another decorative prop. It can change how existing materials participate in a contraption.

That value depends on understandable failure. If a construction breaks, the player should have a chance to learn whether the problem was the relationship, the load, or an unsupported assumption. A sandbox full of unexplained instability would make experiments difficult to improve even when they produce amusing videos.

## 3. A contraption is not just a bag of objects

Facepunch's `duplicator.Copy` reference says it captures the selected entity and its constrained entities and constraints into a structured result. That is a concrete developer-documented implementation boundary, not a claim about every addon or a general proof of safe arbitrary serialization. [G4]

**Interpretation:** copying parts without their relationships would lose what the creator made. A useful reusable artifact retains the relevant structure, not only its appearance or inventory count.

This gives several distinct levels of creative participation:

| Level | What a participant receives | What remains open |
| --- | --- | --- |
| Prop or tool | A useful ingredient or operation | What to do with it |
| Contraption | A working arrangement of ingredients and relationships | Where and how to use or modify it |
| Map or scene | A place in which activity can occur | The goals and conventions of participation |
| Game mode | Rules organizing repeated activity | How particular people play within those rules |
| Server community | People and local expectations | Whether that social experience suits the newcomer |

This is an analytical hierarchy, not the exact package format. A large library of the first two does not guarantee the last three will be enjoyable. Conversely, someone can love a finished mode without wishing to become a builder.

## 4. Trouble in Terrorist Town supplies a game inside the toolset

TTT's official description gives a small minority of players hidden traitor roles and special equipment. The majority must survive and identify them, while everyone can carry dangerous weapons. The designer compares its information structure with Mafia or Werewolf. TTT is included with Garry's Mod, but it is a particular mode, not the entire sandbox's universal behavior. [G5]

**Interpretation:** a familiar shared predicament makes a large space of social behavior understandable. Suspicion, testimony, isolation, and a sudden death acquire meaning because participants know what they are trying to do.

The mode is especially useful as a counterexample to treating all social richness as NPC cognition. Much of the interesting uncertainty comes from human intentions, observations, and communication. Replacing participants with AI might produce a different valuable game, but the appeal of the human version is not evidence that the substitution preserves it automatically.

Nor does a hidden-role system itself supply a satisfying world to inhabit over months. It is a bounded activity with a particular relationship to death and resetting. A persistent settlement would attach different stakes to the same betrayal.

## 5. The designer identifies two limits: idle innocents and social governance

TTT's creator says the best experience depends heavily on playing with people in good faith. He also identifies the problem of giving non-traitors enough to do and notes that map dependence limited his ability to solve it. The Karma system discourages unjustified killing, but cannot assess every nuance that a human administrator can. He favors avoiding excessive rules-lawyering while acknowledging the difficulty of public servers. These are the designer's views, not proof that every server follows them. [G6]

**Interpretation:** a mechanic can generate wonderful incidents yet leave some participants bored between them. The apparent solution—more uncertainty or more enemies—might not address the missing useful activity.

Governance also becomes part of the experience. Too little enforcement can destroy trust; too much can turn improvisation into compliance with a long external rulebook. The challenge is not resolved by giving a creator every possible moderation setting. Players need to understand which behavior is legitimate in the particular space they joined.

A world with extensible rules therefore has both a mechanical and a social compatibility problem. Two configurations can execute successfully while attracting people with incompatible expectations of seriousness, fairness, or creative freedom.

## 6. An actual path from improvised play to distributed mode

Bad King Urgrain's history describes TTT emerging from improvised Serial Killer sessions in the Zombie Master community. Settings, administrators, and honor rules initially carried work later automated by the mode. A small early audience helped the design iterate; a Facepunch competition led to inclusion in Garry's Mod. The creator later observed a substantial traffic increase around 2012–2013 when video creators began playing. He also notes that this attention did not translate into ordinary paid-game revenue for him. [G7]

**Interpretation:** observing an activity people already organize can reveal a useful tool or game. Automating its bookkeeping need not remove its social improvisation. The path is also a reminder that creator value and platform value are not identical.

A popular creation may bring the host new customers without providing its author a sustainable livelihood. Recognition, enjoyment, money, and continued maintenance are distinct rewards and responsibilities. A future creator ecosystem should not infer healthy economics solely from download counts or a successful video.

The historical sequence is a creator's account, not controlled marketing attribution. It also does not imply a new platform can depend on inheriting an established modding audience.

## 7. Community affection and community exhaustion coexist

The negative Steam listing includes a May 2019 reviewer who remembers making friends and enjoying earlier modes but struggles to find suitable active servers and dislikes heavy download requirements. A May 2021 account explicitly separates continued enjoyment of single-player addons from dissatisfaction with multiplayer communities. These are selected historical experiences, not a declaration that the whole current community is unhealthy. Unverified accusations against particular people and claims of security defects in other reviews are not adopted here. [G8]

**Interpretation:** a platform can remain technically capable while a person's preferred social experience becomes difficult to find. The player may miss particular norms, people, or modes—not a feature that can simply be restored by adding another asset.

This distinguishes retention at the platform level from continuity within a community. A new server with the same code may not recreate the former experience. Search, descriptions, social expectations, and reliable introductions can matter as much as creation power.

It also challenges the assumption that a non-creator's enjoyment scales with addon quantity. Downloading and configuring a large content stack can become a barrier before any meaningful play begins.

## 8. Missing assets are a gameplay access problem

Facepunch's July 23, 2025 update incorporated much Counter-Strike: Source and Half-Life 2 episodic content with Valve's permission, reducing the need for additional installations on maps using those assets. Maps, voice-over, and music were excluded, and the announcement explicitly says it does not eliminate all missing content. This is a narrow historical product change, not general licensing advice. [G9]

**Interpretation:** a creation is not portable merely because its configuration file can be shared. It depends on the availability of the objects and presentation it refers to. Missing pieces can make the result ugly, unintelligible, or unusable.

This matters artistically as well as technically. Recombined familiar props can be charming and accessible; broken textures are not the same thing as a deliberately rough aesthetic. A creator platform needs to distinguish intentional remixing from a failed installation.

## 9. The strongest reference is not unlimited content by itself

The official game positions itself around physical construction, cooperative building, and addons. [G10] The more specific examples above show different reasons those facilities can matter: an experiment, a useful machine, a scene, a social deduction round, or a recurring community.

**Interpretation:** the platform's flexibility is most convincing when it supports several complete activities, not merely a theoretically unbounded list of objects. Someone should be able to participate at a comfortable level: play an example, modify a contraption, build a new one, or author a mode.

For OpenLegend inspiration, the key questions are whether a reusable creation includes the relationships that make it work, whether its recipient understands its purpose, and whether the surrounding world gives someone a reason to use it. Those are research questions, not an instruction to build a universal editor or copy TTT's fiction.

## Sources and scope

- **G1 — Facepunch, [Using your Physgun](https://wiki.facepunch.com/gmod/Using_your_Physgun).** Official player guide; placement, rotation, and freeze/release controls.
- **G2 — Facepunch, [Axis tool](https://wiki.facepunch.com/gmod/Tools/Axis).** Official tool constraints and settings; not a claim to reproduce every physical edge case.
- **G3 — Facepunch, [constraint.Weld](https://wiki.facepunch.com/gmod/constraint.Weld).** Primary developer API documentation. Only the documented boundary was inspected, not a full source audit.
- **G4 — Facepunch, [duplicator.Copy](https://wiki.facepunch.com/gmod/duplicator.Copy).** Primary developer reference for copied entities and constraints.
- **G5 — Bad King Urgrain, [Trouble in Terrorist Town](https://www.troubleinterroristtown.com/).** Mode creator's explanation of roles, goals, and participation.
- **G6 — Bad King Urgrain, [TTT Q&A](https://www.troubleinterroristtown.com/about/faq/).** Primary design reflections on idle roles, group fit, and administration; not every server's policy.
- **G7 — Bad King Urgrain, [TTT history](https://www.troubleinterroristtown.com/about/history/).** First-party chronology, iteration, inclusion, and creator-attention account. No exact sales attribution is inferred.
- **G8 — [Most-helpful negative Steam reviews](https://steamcommunity.com/app/4000/negativereviews/?browsefilter=toprated).** Selected 2019 and 2021 accounts. Historical, nonrandom, and partly about specific communities rather than base mechanics; accusations and age generalizations excluded.
- **G9 — Rubat / Facepunch, [July 2025 update](https://gmod.facepunch.com/news/july-2025-update).** Primary account of included assets and explicit remaining limitations.
- **G10 — Facepunch, [Garry's Mod](https://gmod.facepunch.com/).** Current product framing. Marketing examples are not evidence of arbitrary supported physics.

Accessed September 25, 2026. An attempted direct PC Gamer review link was unavailable, so its promotional quotation on the game site is not presented as newly inspected criticism. The [existing chapter and videos](../games/garry-s-mod.md) remain the wider introductory route; no full recording was watched for this addition.

[Back to granular studies](README.md) · [Garry's Mod overview](../games/garry-s-mod.md)
