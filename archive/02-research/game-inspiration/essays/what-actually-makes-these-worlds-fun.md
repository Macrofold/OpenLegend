## 6. What actually makes these worlds fun

The following are cross-case design hypotheses. They synthesize the evidence above; they are not universal laws or independent scientific findings.

### 6.1 Agency is the ability to make a difference, not the length of a command vocabulary

Minecraft construction, Factorio design, and Qud’s alternate capabilities offer different ways to change a situation. A system can expose many commands yet offer little agency if every path has the same result. Conversely, a handful of well-composed operations can create many meaningful approaches. [MC1](../references/sources-01.md#source-mc1) [FA1](../references/sources-01.md#source-fa1) [QU2](../references/sources-01.md#source-qu2)

For OpenLegend, evaluate an invention by the new decision it enables. “Now we can cross this gap, but carrying supplies becomes harder” is meaningful. “The same crossing action now has a different generated name” is much weaker.

A practical test is to ask players to explain a viable alternative they declined. If they cannot identify alternatives, there may be little meaningful choice even when the engine technically supported thousands of combinations.

### 6.2 Legibility makes complexity usable

A player needs enough understanding to act and learn. Full omniscience is unnecessary. The useful distinction is between **mystery about the world** and **confusion about the interface or rules**.

RimWorld’s observable colonist differences, factory bottlenecks, and Noita’s interacting materials illustrate different ways causality becomes meaningful. Hades adds clear reactions at a more expressive layer. [RW1](../references/sources-01.md#source-rw1) [FA1](../references/sources-01.md#source-fa1) [NO1](../references/sources-01.md#source-no1) [HD1](../references/sources-01.md#source-hd1)

OpenLegend should explain actual outcomes at the right level: what happened, what relevant constraint mattered, and what the actor could legitimately know. Developer traces are not a replacement for player-facing feedback. A perfectly logged opaque failure is still frustrating play.

### 6.3 Constraints turn invention into achievement

Resources, time, opportunity cost, danger, incomplete knowledge, and social permission can each make a solution valuable. None should exist merely because “survival games have it.”

The contrast between Valheim’s food policy and Project Zomboid’s harsher survival framing shows why there is no universally correct punitive needs model. Different constraints serve different experiences. [VA1](../references/sources-01.md#source-va1) [PZ1](../references/sources-01.md#source-pz1)

For OpenLegend, retain the distinction between an author making a rule and a character using it. Creator convenience is not a reason to erase resource costs from embodied play. A useful world agent can explain constraints and translate a chosen method without becoming an omnipotent success button.

### 6.4 Persistent attachment needs particular things to attach to

A person’s name, a home, an injury, a favorite object, or an unfinished promise becomes meaningful through accumulated events. Persistence alone is not enough: the relevant consequence must be observable and revisitable.

Hades, The Sims, Wildermyth, and Dwarf Fortress offer distinct forms of continuity. They do not require the same technology or narrative structure. [HD2](../references/sources-01.md#source-hd2) [SIM1](../references/sources-01.md#source-sim1) [WY1](../references/sources-01.md#source-wy1) [DF1](../references/sources-01.md#source-df1)

OpenLegend should choose a few durable anchors early. Let the player see that a person was helped, that a tool was improved, or that a plan changed. Do not fill every object with backstory and assume attachment will follow automatically.

### 6.5 Failure should create a decision, a lesson, or a new story

Failure can be harsh, forgiving, funny, or narratively productive. The important question is what it gives the player next. Hades uses continuation; Kenshi can make setbacks part of a character’s struggle; a factory failure can reveal a solvable flaw. [HD2](../references/sources-01.md#source-hd2) [KE1](../references/sources-01.md#source-ke1) [FA1](../references/sources-01.md#source-fa1)

For OpenLegend, distinguish:

- A failed attempt with understandable consequences.
- An unsupported request that never happened.
- A provider or storage failure outside the fiction.
- A costly but recoverable setback.
- An ending that is genuinely appropriate for the chosen mode.

These should not collapse into one red error or a fabricated narrative. Technical failure is not a good source of drama. When the game is at fault, it should protect the player’s trust rather than ask them to interpret a bug as emergent storytelling.

### 6.6 Alternating tension and care can be stronger than either alone

A world can support expedition and home, action and conversation, production and decoration, novelty and routine. Valheim and Stardew provide useful contrasting rhythms; Hades demonstrates another form of alternating activity and character interaction. [VA1](../references/sources-01.md#source-va1) [SD1](../references/sources-01.md#source-sd1) [HD1](../references/sources-01.md#source-hd1)

OpenLegend’s native autonomy should create room for the player to engage with interesting situations. If every quiet minute requires maintenance, the world never feels settled. If nothing can disrupt it, preparations may become meaningless. Tune the rhythm to the intended audience rather than maximizing incident frequency.

### 6.7 A distinctive world beats a neutral demonstration of generality

Qud’s science-fantasy identity, Hades’ expressive cast, and Stardew’s coherent home-oriented setting are not incidental containers around mechanics. They help people understand and care about what they are doing. [QU1](../references/sources-01.md#source-qu1) [HD3](../references/sources-01.md#source-hd3) [SD1](../references/sources-01.md#source-sd1)

OpenLegend can have a general engine and a strongly authored default world. A reusable engine does not require a generic opening experience. In fact, the default should prove why its mechanics are worth using.

This is also a marketing advantage: “an evolving group of people surviving and inventing together” is easier to picture than “a modular framework for arbitrary authored realities.” The second can be true technically while the first remains the player-facing promise.

### 6.8 Authored and generated content are complements

Wildermyth and Qud explicitly mix authored elements and procedural variation. Hades shows the value of deliberate character writing; RimWorld shows how mechanical situations create narrative material. [WY1](../references/sources-01.md#source-wy1) [QU2](../references/sources-01.md#source-qu2) [HD3](../references/sources-01.md#source-hd3) [RW2](../references/sources-01.md#source-rw2)

For OpenLegend, authorship can define the cast’s initial identity, a few meaningful dilemmas, world tone, and the shape of good consequences. Generation can personalize, interpret, and extend. Do not ask a model to invent every layer at once and then attribute incoherence to a need for a larger context window.

### 6.9 Autonomy is valuable when it preserves—not replaces—the player’s role

An NPC who can complete a known task without constant prompting can make the world feel alive. An NPC or world agent who silently selects and executes the optimal solution to every problem can make the player irrelevant.

The design distinction is **delegated execution versus delegated purpose**. A player may reasonably say “build the shelter we agreed on” while still wanting to choose where, for whom, and with which tradeoff. In creator mode, more comprehensive delegation can be appropriate. The UI and permissions should make the role clear.

OpenLegend should test how much participation different players want. Do not assume either constant micromanagement or total automation is universally satisfying.

### 6.10 “Fun” is plural

The cases support several motivations: mastery, creative expression, discovery, social connection, care, spectacle, strategic planning, and personal narrative. A mechanic can serve one while harming another.

The goal is not to maximize every motivation in one mode. Decide the opening experience’s center of gravity. Then make optional modes or creator settings explicit. A harsh simulation and a forgiving creative world can share an engine while making different promises.

---
