# Games, emergence, and transferable design

Status: research and proposals, not accepted product decisions. Sources checked on September 18, 2026 (America/New_York), corresponding to September 19 UTC for this research session. Historical development posts establish design history; their old balance numbers are not claims about the current release. No game implementation accompanies this document.

## 1. What RimWorld actually demonstrates

RimWorld is the strongest reference for **consequences connecting across systems**. Its official description places survival needs, relationships, injuries, crafting, trade, environmental hazards, and an event-directing storyteller in one colony simulation. The storyteller supplies incidents such as storms, raids, and visitors; its selected style changes their pacing. Colonists also respond to hunger, fatigue, surroundings, and social circumstances. These are distinct responsibilities: incident direction is not the same thing as each character deciding what to do. The word “AI” on the product page does not establish LLM cognition.

The health model records conditions on particular body parts, including limbs and organs. Damage changes capabilities: impaired eyes affect precise work, while injured legs affect movement. Species can have different anatomy. Relationships include individual opinions, family, and romantic bonds. Backgrounds influence capabilities and permitted work. These features support stories because a local event can affect several later choices. [Official RimWorld overview](https://rimworldgame.com/)

### Needs, schedules, and local autonomy

Ludeon's historical Alpha 10 announcement describes recreation as a need with several fulfillment methods. Repetition reduces the usefulness of the same recreation type. Timetables designate sleep, work, recreation, or free choice. Clothing policies constrain apparel selection while colonists choose suitable items; food selection considers distance, taste, and psychological preferences. This is bounded autonomy within authored systems, rather than arbitrary authority to invent new mechanics. The announcement also illustrates incremental development: a new need became meaningful by adding several activities and connections to existing systems. [Alpha 10 development post, 2015](https://ludeon.com/blog/2015/04/rimworld-alpha-10-joy-system-released/)

**Open Legend proposal:** use needs to generate priorities, policies to constrain choices, and an action scheduler to execute them. A hungry actor can seek food without constructing a new prose thought at every footstep. Natural-language intent still matters when interpreting a novel request or choosing among socially different options. Registering a known mechanical action must record the semantic conditions under which it is appropriate; “eat” should not silently treat poisoned food, stolen food, and a gift as identical situations.

### Health, personality, and thoughts are different layers

The Alpha 6 announcement explains the move from aggregate hit points to wounds associated with anatomy and capabilities. It describes pain, bleeding, treatment, and persistent damage, alongside gameplay traits such as industriousness. These traits are authored game modifiers, not a validated human personality instrument. [Alpha 6 development post, 2014](https://ludeon.com/blog/2014/08/alpha-6-whole-new-world-released/)

A revealing historical bug allowed repeated corpse observations to stack excessive mood penalties. Ludeon's fix changed the stacking multiplier in a thought definition. This is evidence for an important engineering problem: repeated observations require controlled accumulation. It is not evidence that a particular multiplier remains appropriate today. [Official thought-stacking hotfix](https://ludeon.com/blog/2014/12/hotfix-for-saw-corpse-though/)

**Open Legend proposal:** represent a need as a resource or pressure, a wound as a physical condition, a thought as an interpreted event, a trait as a slow tendency, and mood as a temporary summary. Give thoughts an event identifier, source, onset, decay, stacking group, and maximum aggregate effect. Walking past the same burned house ten times should not create ten independent bereavements. Repeated harassment may legitimately accumulate, but the rule should distinguish separate incidents from repeated perception of one incident.

### Social history provides consequences

The Alpha 13 feature announcement describes relationships, opinions informed by memories and situations, extended family, romance, arguments, social fights, animal bonds, and characters who can return after leaving the map. It describes a planned release at that historical point; the current overview independently confirms the broad relationship system. [Alpha 13 feature summary, 2016](https://ludeon.com/blog/2016/03/features-summary-alpha-13/)

**Open Legend accepted direction (September 20, 2026):** [structured kinship and unstructured relationship descriptions](../03-design-proposals/agents-and-social-simulation.md#social-continuity) replace the earlier proposed relationship facets. Each person freely revises their own memory-based description of another person without points or thresholds; Alice can call Ben a friend while Ben distrusts Alice. Keep commitments separate. An NPC's sentence about being angry should come from its current appraisal and accessible memory. Other players discover that account through conversation or observable behavior rather than receiving the actor's private state panel. This is design direction, not live acceptance evidence.

### Base game versus expansions

These official expansion pages describe additional scope. Their content should not be mistaken for the original game's complete baseline, or for an appropriate first-release checklist.

| Expansion | Verified scope relevant to Open Legend | Transferable question, not a decision |
|---|---|---|
| [Royalty](https://rimworldgame.com/royalty/) | Titles, psychic powers, empire relations, and generated quests | Can institutions introduce obligations and privileges through reusable rules? |
| [Ideology](https://rimworldgame.com/ideology/) | Beliefs, social roles, rituals, preferences, and cultural constraints | Can different interpretations of the same event produce different reactions? |
| [Biotech](https://rimworldgame.com/biotech/) | Childbirth and childrearing, genetic modification, mechanoids, pollution | Can life stages and reproduction arrive as a coherent later module? |
| [Anomaly](https://rimworldgame.com/anomaly/) | Horror events, strange entities, containment, investigation | Can a sector receive an optional scenario such as the proposed zombie outbreak? |
| [Odyssey](https://rimworldgame.com/odyssey/) | A mobile colony in a gravship, exploration, new biomes and landmarks | Can places acquire new constraints without rewriting every actor? |

The distinction matters especially for pregnancy and children: the official Biotech description explicitly includes these systems. Open Legend's requested lifecycle should have its own schedule, content boundaries, and design review rather than assuming it is a small addition to adult NPCs.

### Emergence still needs design

**Interpretation:** the valuable pattern is a graph of dependencies: injury affects mobility; mobility affects obtaining food; food affects physical state; physical state affects priorities; interactions affect relationships. A designer need not script the entire resulting story. But designers still define the component meanings, update rules, available actions, and feedback.

**Illustrative Open Legend scenario:** a storm damages a shared shelter. Mira spends supplies repairing it, delaying her promised meal with Jo. Jo initially interprets the absence as rejection. A witness explains the repair, Jo revises the belief, and the pair agree to store emergency supplies together. The proposed story uses weather, inventory, commitments, perception, appraisal, and dialogue. It does not require a hundred emotion bars, cloth simulation, or a fully simulated government.

RimWorld should guide causal richness and legibility. It does not establish that arbitrary player requests can safely generate executable rules, that an LLM can adjudicate everything economically, or that a multiplayer server can reproduce a pauseable colony game's pacing. Those are separate Open Legend research questions.

## 2. Dwarf Fortress: material detail and persistent history

Bay 12's official feature description documents generated civilizations and histories, persistent worlds, fortress and adventure play, thoughts, social venues, healthcare, and moddable object definitions. Combat includes body parts, tissue and material properties, bleeding, pain, and more. The world includes vertical space, weather, water, and extensive production systems. This reference shows how many comparatively small rules can interact in a durable world. The feature page also contains legacy presentation details, so it should not be used as a current UI specification. [Bay 12 official features](https://bay12games.com/dwarves/features.html)

**Proposed transfer:** begin with a small typed material vocabulary—wood, stone, cloth, flesh, and metal—with explicit attributes used by the interactions we actually ship. Record origin and transformation history for important items. A repaired keepsake may matter because its owner remembers who repaired it; that requires identity and provenance, not thousands of material constants.

**Proposed scope limit:** do not model every tissue, geological layer, craft, or historical person initially. A new anatomical node should be added when a gameplay consequence requires it. A head injury, hand injury, and leg injury can already support the helmet-punch example, loss of dexterity, and impaired walking. Reserve stable part identifiers and parent relationships so internal organs can be introduced later.

## 3. The Sims: readable motives and social play

EA's official character description separates personality traits and aspirations, and describes player choices as influencing how Sims think, move, and feel. [EA's character overview](https://thesims-api.ea.com/game-info/smarter-sims) EA's current help documentation identifies hunger, energy, bladder, hygiene, fun, and social needs; its Natural Living article describes expansion-specific ways to satisfy them. Those outdoor abilities should not be confused with the base game's feature set. [EA Natural Living guide](https://help.ea.com/en/articles/the-sims/the-sims-4/natural-living-skill/)

**Proposed transfer:** survival becomes enjoyable when satisfying needs creates choices, relationships, and places to visit. Eating together can advance nutrition and a relationship; resting near a noisy gathering can restore energy poorly while creating an annoyance. Comfort and social connection can therefore matter before combat or elaborate technology exists.

**Open question:** should bladder and hygiene exist at launch? They are familiar simulation motifs, but neither is necessary to prove Open Legend's most distinctive promise: meaningful conversation with autonomous characters in a persistent world. Hunger, fatigue, comfort, and social connection offer a smaller initial set. Death, reproduction, and aging require world-time rules; they should not inherit accidental pacing from a rendering frame rate or an LLM response delay.

## 4. Minecraft and RuneScape: pricing patterns, not price prescriptions

The current US-facing Minecraft Realms comparison displays Bedrock subscriptions at $3.99/month for the host plus two concurrent players and $7.99/month for the host plus ten. It distinguishes simultaneous players from the much larger invitation limit. Realms Plus includes Marketplace Pass; “friends play for free” concerns the subscription and does not mean Minecraft itself is free. Prices and platform conditions should be rechecked before a commercial decision. [Official Realms comparison](https://www.minecraft.net/en-us/realms)

Jagex's support page describes membership as access to additional areas, skills, quests, and future content. The Old School membership page also lists housing and dedicated member worlds. Its dynamically rendered prices were not readable in this research session, so this document does not assert a current subscription amount. RuneScape and Old School RuneScape are related but distinct products; their feature counts should not be interchanged. [Jagex subscription support](https://support.runescape.com/hc/en-gb/articles/43699154194705-Managing-Subscriptions), [Old School membership](https://osrs.runescape.com/membership)

**Candidate Open Legend packaging:** a useful free common world, paid allowances for expensive generative interactions, optional extra character slots, and eventually private hosted sectors. These are hypotheses for testing. A Minecraft hosting price is not a viable budget estimate for inference, speech generation, moderation, and persistent NPC activity.

Define the free-tier experience before its numerical quota. Basic survival, movement, viewing nearby events, and using already established actions should remain intelligible when generative allowance is exhausted. Charge for an understandable benefit such as an allowance of novel interactions or conversation time; do not expose token accounting as ordinary gameplay. Consider how paid novelty becomes a free reusable mechanic, who pays for autonomous NPC conversations, and whether extra character slots also multiply background compute.

## 5. Proposed 80/20 experiments

| Experiment | Smallest useful setup | Evidence that would justify expansion |
|---|---|---|
| Social continuity | A player, a few adults, one shared place, remembered promises | Players can explain why relationships changed across sessions |
| Embodied consequences | Hunger, rest, simple anatomy, clothing protection | Dialogue and actions agree about injuries and capabilities |
| Socially meaningful resources | Food, wood, shelter, trade, one repair activity | Cooperation changes outcomes without a mandatory faction system |
| Bounded novelty | One unfamiliar request composed from existing primitives | A second actor reuses the approved result consistently |
| Limited perception | Two rooms, a door, speech and a loud event | Hidden information stays hidden until perceived or communicated |

These are proposed tests, not implementation commitments. Measure causal consistency, player comprehension, boredom from maintenance, frequency of surprising but coherent outcomes, and recovery after a bad generated interpretation. A larger content catalogue is justified only when it improves those outcomes.

## 6. Remaining research targets

- Conduct hands-on observation of current RimWorld versions: this research used official documentation, not a play session or code audit. Examine needs displays, job interruption, injury explanations, and relationship feedback without treating community mods as base features.
- Test whether social memory creates stronger player attachment than additional physical simulation.
- Compare a quiet settlement with an optional event director; the brief permits no mandatory overarching goal.
- Prototype population and aging rates on paper so growth does not overwhelm sector capacity.
- Validate commercial demand and inference usage before selecting prices or promising unlimited interaction.
