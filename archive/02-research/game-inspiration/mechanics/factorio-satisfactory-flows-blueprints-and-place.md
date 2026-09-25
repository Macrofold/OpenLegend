# Factorio and Satisfactory: flows, reusable designs, and inhabiting a machine

**Gameplay inspiration; researched September 25, 2026.** Read alongside the [existing comparative chapter and separate field guides](../games/factorio-and-satisfactory.md). Earlier reviews, videos, growth context, and conclusions remain there. This study adds specific interaction chains and a developer-documented implementation example; it is not an architecture prescription for OpenLegend.

## 1. Five different things the player manages

The useful analytical vocabulary is **stock, flow, capacity, dependency, and control**. A stock is what exists now; a flow replenishes or consumes it; capacity limits that flow or storage; dependencies decide what can operate; control changes operation in response to information. Increasing one does not necessarily improve the others.

Consider a hypothetical workshop inspired by these games: adding a second finishing machine is ineffective when both wait for the same scarce intermediate. A warehouse can postpone overflow without solving its cause. A reusable layout can describe an excellent workshop without supplying its building materials. These are reasoning examples, not reported play sessions.

The attraction is that the player can often inspect a problem, make a hypothesis, change the arrangement, and observe whether the explanation was correct. That makes failure potentially useful. It also means a game can become exhausting when diagnosis is unclear or implementing a known answer consumes too much repetitive labor.

## 2. Factorio oil: a surplus can cause a shortage

Advanced oil processing produces heavy oil, light oil, and petroleum gas. A full output stops the refinery's other products too. Storage can absorb a surplus temporarily; cracking provides another use for excess heavy or light oil. Basic oil processing is a different recipe and should not be described as having the same three outputs. [F1]

**Worked interaction:** a player needs petroleum but has filled heavy-oil storage. Building more refineries repeats the bottleneck. A cracking route changes the relationship between outputs; conditional control can preserve some heavy oil instead of always consuming it. This is a mechanics example, not a claim that a particular player took these steps. [F1] [F2]

**Interpretation:** the interesting invention is not necessarily a new end product. It may be a conversion, buffer, priority rule, or alternative route that changes what the existing system can sustain. Side products are especially useful because they make local success create another decision rather than simply multiply rewards.

Avoid copying precise ratios out of context. Machine speed, modules, selected recipes, and expansion content can alter them. The important reference is coupled outputs and their consequences, not a universal ideal factory size.

## 3. Circuit networks: information becomes a material design tool

Factorio's circuit network carries numeric signals from connected sources. Multiple values on the same signal add; red and green networks provide distinct connections. Receivers can compare signals to enable or disable behavior. A storage tank can report its contents; an inserter can act on a condition. The signal is information about material, not transported material itself. [F2]

**Interpretation:** this creates a second layer of invention. First the player builds production, then they build a rule governing production. That rule can be understandable without an unrestricted programming language: stop making an item when sufficient stock exists, or permit one route only when a reserve remains.

It is useful to distinguish a continuing state from a one-time occurrence. The documented belt and inserter interfaces include held signals and brief pulses. Those are not interchangeable: counting a pulse as persistent stock or counting held stock repeatedly would describe different behavior. [F2]

For inspiration, the valuable object is an inspectable rule connecting observation to a supported operation. Its complexity should earn a practical use; requiring every newcomer to program a feedback circuit would be a different onboarding promise.

## 4. Blueprints: knowledge, specialization, and construction remain separate

A Factorio blueprint records a layout. Placement produces ghosts; a player or construction robots still needs to build the actual entities using available resources. Books and libraries organize designs, and text export makes them shareable. Parameterization lets a layout expose selected settings instead of forcing every copy to use the same recipe or signal. [F3]

**Interpretation:** this is several levels of reusable content, not one:

| Artifact | Value supplied | What remains to be decided |
| --- | --- | --- |
| A remembered design | The player understands a solution | Whether it fits this problem |
| A blueprint | Reproducible arrangement | Where and with what resources to build |
| A parameterized design | A constrained family of arrangements | Which compatible specialization to choose |
| A constructed installation | A working local system | How to supply, maintain, and expand it |

The table is our conceptual reading. It does not assert a new in-game artifact type. Its relevance is that convenience can remove repeated transcription while preserving the consequential decisions. A shared template is strongest when its recipient understands what assumptions it makes; importing an opaque optimal answer can be a different, sometimes less satisfying experience.

## 5. Pollution: production changes the surrounding problem

The Factorio wiki distinguishes pollution produced by machines, the spread and absorption of the pollution cloud, and its role in assembling attacks. It specifically warns that containing the cloud does not negate evolution driven by emitted pollution. Trees and terrain also affect absorption; settings can alter or disable pollution. [F4]

**Interpretation:** this couples expansion to environment and defense. A factory's external cost is not just deducted from an abstract score: it changes what pressure reaches the player. This is an example of a system generating a reason to care about its surroundings.

It is not evidence that every constructive game needs enemies or escalating punishment. The useful question is whether growth introduces new meaningful responsibilities, rather than only longer production times. A social workshop might produce noise, demand transport, or consume a contested resource instead; those are inspiration hypotheses, not existing Factorio features or approved OpenLegend mechanics.

## 6. One actual implementation lesson: preserve the experience while doing less work

Wube's February 2017 belt article describes grouping adjacent belts into transport lines and storing gaps between items rather than updating every item's absolute position each tick. Much of the movement could then be represented by changing terminal gaps; inserters and interruptions required additional handling. The article reports historical improvements for that work. [F5]

This is direct developer evidence about the 0.15-era implementation, not a claim that the entire current engine uses one constant-time algorithm. Nor is it a prescription to reproduce the representation elsewhere.

**Interpretation:** apparent simulation richness and implementation cost need not increase identically. The player cares that the material flow remains coherent. A good optimization preserves that experience instead of silently changing the rules. The opposite error is to simulate incidental detail expensively while leaving the player unable to understand the flow.

## 7. Satisfactory: the production graph becomes a place

Satisfactory's official description emphasizes first-person factory construction, vertical building, exploration, and solo/cooperative play. This is not merely Factorio with a different camera: the player's movement through the constructed place becomes part of its meaning. [S1]

Ray Knight's 2019 account describes the arithmetic behind ore, ingots, rods, and screws, including an oversupplied iron-rod line when constructor rates fail to match. He found the calculation engaging enough to analyze it as mathematics in play. This is an early-access personal account, not a current recipe-balance reference. [S2]

**Interpretation:** readable quantities and visible objects can reinforce each other. A warehouse, bridge, or high conveyor has a logistical role and a spatial presence. Designing where the player moves can be part of the satisfaction even when output remains unchanged. A creative assistant that optimizes only throughput would miss that intention.

### Cooperative roles need not require identical motivations

Adam Cook's 1.0 review describes one partner staying with factory calculations while another explores, collects useful discoveries, and connects distant locations. He praises the ability to choose a personally worthwhile activity and the freedom to construct despite some clipping. He also notes that the initial progression may feel slow to some players. [S3]

**Interpretation:** different pleasures can contribute to a shared project: engineering, exploration, architecture, logistics, and playful experimentation. This is especially relevant to inhabitants with distinct abilities or preferences. Participation is more interesting when multiple kinds of contribution matter—not when every participant performs the same collection loop in parallel.

### Friction is not one thing

The prior chapter retains the detailed negative review about placement effort and three-dimensional alignment. Keep it beside the positive embodied-place account rather than treating either as universal.

A useful distinction is **deciding an arrangement**, **expressing the arrangement**, and **executing the work**. Automatic placement can help with the second and third without necessarily taking away the first. Conversely, completely optimizing the factory for the player may remove the pleasure that made repetition acceptable. That tension is an interpretation to explore, not a rule that all automation is either good or bad.

## 8. Development, packaging, and the growth of expectations

In a February 2021 retrospective, Wube reported more than 2.5 million copies sold and explained choosing one substantial expansion over a sequel or many small DLC packs. Its reasons included retaining polished work, avoiding fragmented combinations, and creating a coherent product capable of attracting renewed attention. The team also chose to pause its regular blog while experiments were unstable, to avoid turning discarded ideas into perceived broken promises. [F6]

These are the developer's dated strategy and milestone, not proof that an expansion caused a particular number of sales. The 2021 claim that 1.1 would be the final vanilla release is historical planning, not a statement of present version status.

**Interpretation:** production communication is part of expectation design. Exposing every speculative mechanic may recruit interest but also make ordinary iteration look like a withdrawal. A reusable-content ecosystem likewise benefits from clear labels for a working design, an experiment, and an unsupported ambition.

The original chapter supplies the existing trailers and reception analysis. For watching, compare the [official Factorio 2020 trailer](https://www.youtube.com/watch?v=J8SBp4SyvLc) with the [Satisfactory 1.0 trailer](https://www.youtube.com/watch?v=Jt4XOPiPJHs): watch the relationship between flows and built space. These previously identified videos were not watched in full during this pass; no scene timestamps are asserted.

## Sources and scope

All accessed September 25, 2026. Wiki rules can evolve; expansion-specific content is not silently applied to the base game.

- **F1 — [Oil processing](https://wiki.factorio.com/Oil_processing), Official Factorio Wiki.** Detailed recipes, output blocking, cracking, and version distinctions; community-maintained rules documentation, not our gameplay test.
- **F2 — [Circuit network](https://wiki.factorio.com/Circuit_network), Official Factorio Wiki.** Numeric signals, connections, conditional devices, pulse/hold semantics.
- **F3 — [Blueprint](https://wiki.factorio.com/Blueprint), Official Factorio Wiki.** Ghost placement, resource-dependent construction, library/export, parameterization.
- **F4 — [Pollution](https://wiki.factorio.com/Pollution), Official Factorio Wiki.** Distinguishes emissions, cloud absorption, attacks, and evolution.
- **F5 — Harkonnen / Wube, [Friday Facts 176: Belts optimization for 0.15](https://www.factorio.com/blog/post/fff-176), February 3, 2017.** Primary historical implementation explanation; no extrapolated current capacity claim.
- **F6 — Wube, [Friday Facts 365: Future plans](https://www.factorio.com/blog/post/fff-365), February 5, 2021.** Primary historical production, product-packaging, sales, and communication account.
- **S1 — Coffee Stain, [Satisfactory](https://www.satisfactorygame.com/).** Primary product scope; promotional source, not comparative satisfaction evidence.
- **S2 — Ray Knight, [Satisfied with Satisfactory](https://www.cambridgemaths.org/blogs/satisfied-with-satisfactory/), September 3, 2019.** First-person educational analysis of early-access play; not a current optimization guide.
- **S3 — Adam Cook, [Satisfactory review](https://godisageek.com/reviews/satisfactory-review/), September 10, 2024.** Original 1.0 criticism; historical interface comments are not assumed current.

[Back to granular studies](README.md) · [Comparative game chapter](../games/factorio-and-satisfactory.md)
