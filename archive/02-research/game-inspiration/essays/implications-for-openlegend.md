## 9. Implications for OpenLegend

### 9.1 Choose a first player promise that does not require explaining the engine

My recommended opening promise is:

> **Meet particular people, survive and build together, and invent solutions that change your shared world.**

The engine can eventually support very different realities. The first game still needs a clear identity. “Any mechanic is possible” is an ambition and a creator promise; it is not yet a reason to spend an evening playing.

A useful initial experience would let a player recognize several things without reading design documentation: someone needs something, available solutions differ, characters have their own priorities, inventions have actual constraints, and the consequences persist. The order and difficulty can vary. The clarity should not.

### 9.2 Build three loops, but do not give them equal priority immediately

**Embodied play loop:** notice a need or opportunity → choose an approach → interact with people and materials → encounter a consequence → adapt.

**Relationship loop:** experience something together → form or revise a view → act differently later → create a new consequence.

**Creator loop:** choose an intended experience → reuse or author supported mechanics → review consequential choices → test → publish/adapt.

The first two should make the default world valuable before the third requires a public ecosystem. Creator tools can still help build and test the game internally. What should wait is the assumption that external creators will supply the experience the default world lacks.

### 9.3 Distinguish the world agent from the inhabitants

The world agent is an authoring and inspection interface. It can be helpful, concise, and technically capable. An inhabitant is a character with perspective, uncertainty, preferences, and commitments. Making both act like the same accommodating assistant would flatten the game.

The world agent may explain how a creator’s touch-only species was configured. An embodied character should not inherit creator knowledge of hidden objects, world rules, or other minds. The player may deliberately switch roles, but the transition should be explicit.

This distinction also protects fun. In creator mode, “make a working example of this mechanic” is reasonable. In play, automatically supplying the optimal invented solution may remove exploration and achievement. Let the player choose how much help to request, and label when assistance changes the challenge.

### 9.4 Make memory pay rent in behavior

Prioritize a small set of observable continuity cases:

- A promise remains relevant later and affects resource allocation.
- A character recalls help or harm and behaves differently, without mechanically forcing a relationship label.
- A false belief can be corrected through evidence.
- A failed invention changes the next attempt.
- A remembered location or person becomes useful when a new goal appears.

The test is not whether an NPC can retrieve a record when asked. It is whether the record appropriately changes what happens. That is the opportunity suggested by the contrast among RimWorld, Hades, and The Sims—not a claim that any of them uses OpenLegend’s architecture. [RW1](../references/sources-01.md#source-rw1) [HD2](../references/sources-01.md#source-hd2) [SIM2](../references/sources-01.md#source-sim2)

### 9.5 Make invention a decision, not a transaction with a wish engine

A worthwhile invention episode can include purpose, discovery, material constraints, method, uncertainty, testing, and refinement. Not every invention needs all of them. A small practical improvement can be satisfying.

The creator’s natural language should hide incidental technical complexity, not all consequential choices. For example, the world agent can choose schema fields and validate compatible components while asking the creator whether the spell lasts while contact continues or ends after a fixed interval. That decision changes gameplay and should remain understandable.

Reusable constructs should help creators make interesting variations. They should not turn every artifact into an opaque black box with a different name. A portable mechanic is more attractive when someone can understand what it does, where it works, and which aspect they can change.

### 9.6 Author a few excellent examples before relying on long-tail generation

Build examples that establish the intended quality of interaction: a shelter problem with more than one solution; two people whose commitments conflict; an unfamiliar object whose properties can be learned; an invention whose limitation is useful rather than merely punitive.

These need not be rigid scripted quests. They can be reusable starting conditions and pressures. The goal is to know that at least one path through the system produces compelling play, then test whether variation preserves that value.

Avoid examples that exist only in developer-controlled demonstrations. A newcomer should be able to encounter and influence them without knowing hidden commands, exact phrases, or the implementation’s favorite route.

### 9.7 Prioritize a coherent aesthetic

A flexible world engine can still have a recognizable default look, sound, prose style, and social tone. Do not equate generative variety with artistic range. A random mixture of individually attractive outputs may be less memorable than a constrained, consistent style.

Likewise, do not remove small character flourishes solely because they do not alter a number. Their value can be emotional and social. The Hades interviews provide a direct developer counterpoint to a narrowly functional view of design. [HD2](../references/sources-01.md#source-hd2) [HD3](../references/sources-01.md#source-hd3)

### 9.8 Suggested product priorities

This is a product ordering, not a replacement for the technical trackers:

| Priority | Player-visible result | Why it precedes broader ambition |
|---|---|---|
| 1 | An uncoached newcomer finds an interesting decision quickly | Without this, a richer world mostly amplifies confusion |
| 2 | A few inhabitants exhibit useful autonomy and selective continuity | This proves the distinctive AI value |
| 3 | One invention solves a real problem with understandable tradeoffs | This proves language-to-mechanics as play, not a demo |
| 4 | A place, relationship, or project remains worth returning to | This separates novelty from durable appeal |
| 5 | A second person can understand and reuse a creation or story | This validates the beginnings of a sharing/creator loop |
| 6 | Broader worlds and mechanics preserve these properties | Generality follows evidence rather than preceding it |

The technical foundation still matters. Reliable state, permissions, effects, and performance are prerequisites for trust. The recommendation is to judge those investments by the experiences they unlock—not to abandon architectural discipline.

---

### 9.9 The strongest new comparisons change the product priorities

**Palworld increases the importance of useful, expressive inhabitants.** An inhabitant can contribute to the player’s practical project while retaining needs, personality and boundaries. The first proof need not be a huge conversational model; it should show capability and character in the same outcome.

**Balatro and Slay the Spire strengthen the case for a small grammar of meaningful constructs.** Reusable operators should compose into understood tradeoffs. More installed rules are not always better; a world can become more distinctive by excluding redundant or incompatible mechanics.

**Zomboid and Core Keeper connect perception to practical play.** A sense must change how a person approaches, investigates, prepares, communicates or risks something. Faithful uncertainty is more valuable than verbose sensory descriptions that do not change action.

**Stardew’s dissenting reviews sharpen the social opportunity.** A town that notices the right contribution can feel more alive than one offering endless gift-point transactions. But AI-driven gratitude must affect behavior; it cannot be merely a prettier version of the same canned loop.

**PoE and Diablo warn that changing rules changes perceived ownership.** A reusable construct represents learned competence and invested work. Revising it requires clear consequences, pinning/transition semantics and appropriate policy, not merely a successful schema migration.

**Roblox and Fortnite separate creation from distribution.** Creator success requires an audience, understandable adoption and repeat participation. Natural-language authoring can lower supply-side friction while leaving demand almost untouched. Measure successful use by another person rather than generated artifact count.

These are the researcher’s product recommendations from the cases above, not an instruction to override accepted engine permissions or implementation roadmaps.

### 9.10 A specific default-world center of gravity

My recommended initial mix remains: an overhead, readable world; a few useful and particular inhabitants; practical projects with more than one viable solution; persistent social and material consequences; and enough quiet time to care about a place.

The ambition of new senses, goals, spells and reusable constructs should enlarge that experience. The danger is shipping a technically broad reality that gives a player no reason to prefer one decision over another.

Do not turn all three user roles into the same assistant conversation. **Player-character:** acts with limited knowledge and consequences. **Creator:** changes supported rules within authorized scope. **World agent:** helps translate and inspect the creator’s intentions. An embodied inhabitant should not behave like an omniscient authoring assistant, and creator convenience should not silently erase the game’s constraints.
