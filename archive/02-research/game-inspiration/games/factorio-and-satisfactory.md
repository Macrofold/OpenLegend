### 4.5 Factorio and Satisfactory — visible systems, expanding mastery

**Evidence.** Factorio combines resource extraction, research, production, infrastructure, automation, and defense. Satisfactory presents a related factory-building fantasy through first-person exploration and construction. Wube’s engineering retrospective also documents how distributed dependencies in its own code made changes costly and justified refactoring. [FA1](../references/sources-01.md#source-fa1) [SA1](../references/sources-01.md#source-sa1) [FA2](../references/sources-01.md#source-fa2)

**Interpretation.** These games make a system’s behavior visible. The player notices a bottleneck, forms a hypothesis, changes the design, and observes improvement. A machine that continues to work becomes evidence of competence. Automation is satisfying partly because the player first understood the labor it replaces.

**Key versus optional.** Feedback, coherent interfaces, compositional reuse, and progressively richer problems matter more than a universal simulation of manufacturing. The first-person versus overhead contrast also suggests that presentation changes the feeling of ownership without changing the core logic of building a useful system.

**Pitfall.** If the optimal answer becomes tedious repetition, convenience tools can improve play. But automatically designing the complete factory removes a different thing: the opportunity to solve it. OpenLegend’s world agent should distinguish translating a chosen design from choosing all its interesting parts.

**Transfer.** Make inventions inspectable through inputs, outputs, costs, limitations, and actual outcomes. Let a player improve a mechanism because they understand why it failed. Reusable player constructs should preserve that comprehensibility rather than become opaque generated code. Borrow Wube’s production lesson as well: stable shared interfaces should reduce the number of places a new mechanic must be wired in.


<!-- BEGIN FIELDGUIDE ADDITION -->
<a id="field-guide-factorio"></a>

#### Gameplay field guide — Factorio

**What you actually do.** You begin doing small manufacturing jobs yourself and gradually build machines that do them continuously. Those machines need materials, power, routing, and defense. Progress makes the factory larger, but also lets you think in higher-level components instead of manually repeating every early action. [FG-FA-O](../references/sources-03.md#source-fg-fa-o)

**What the reviewed accounts value.** The strong positive theme is competence made visible: a previously awkward task becomes a reliable system, then a component of a larger system. Fixing the next bottleneck gives an immediate, understandable reward. The review describes automation itself “clicking” as the player moves beyond producing end products to manufacturing the tools that expand production. [FG-FA-C](../references/sources-03.md#source-fg-fa-c)

**What they dislike or find limiting.** Direct combat is less compelling than the engineering around it for the critic, and tiny placement/readability mistakes can consume attention disproportionately. More generally, players who do not enjoy diagnosing interconnected production problems may experience the central pleasure as work. That last statement is a fit hypothesis, not a prevalence finding. [FG-FA-C](../references/sources-03.md#source-fg-fa-c)

**The design tension.** Automation is rewarding when it preserves the player’s design authorship. Eliminating repetitive execution is different from automatically selecting the entire factory design.

**Watch to understand the game**

1. **[Factorio — Trailer 2020](https://www.youtube.com/watch?v=J8SBp4SyvLc)** — Official Wube gameplay montage. Follow raw inputs becoming intermediate products and a working factory. It is an unusually compact way to see repeated units compose into a larger industrial system. **Caution:** Staged and edited production showcase; the camera presentation is not the ordinary player view.

**Three concrete in-game situations**

1. **More assemblers do not fix a starved circuit line.** *Documented mechanic.* Electronic-circuit production depends on upstream ingredients. Expanding the final production stage cannot raise throughput if its feed is insufficient. The player diagnoses the line and changes supply or layout. This makes the reason an invention fails visible in material flow rather than a vague “efficiency” score. [FG-FA-C](../references/sources-03.md#source-fg-fa-c)

2. **An unwanted oil product stops the wanted one.** *Documented mechanic.* Advanced refining produces several fluids; a full output can stop the whole refinery. Storage, consumption, or cracking the surplus changes that constraint. An apparently local shortage is therefore caused by a downstream surplus. This is a concrete example of side products making a system more than a one-input/one-output recipe. [FG-FA-OIL](../references/sources-03.md#source-fg-fa-oil)

3. **A blueprint carries a solution, not free matter.** *Documented mechanic.* A working subfactory can become a blueprint, be shared, and be placed as a ghost layout. Actual construction still needs resources and execution. Parameterized blueprints can specialize a reusable layout. This is very close to OpenLegend’s distinction between a reusable construct, its binding, and a live instance. [FG-FA-BP](../references/sources-03.md#source-fg-fa-bp)

**What to borrow for OpenLegend.** Borrow visible inputs, constraints, outputs, and reusable interfaces. Let the World Agent help express and inspect a chosen design while preserving decisions about purpose, layout, resources, and tradeoffs. The first reusable mechanic need not simulate an entire industrial economy.

*Scope/evidence note:* Base-game systems unless noted; examples describe documented mechanics, not a play session conducted for this research.

<a id="field-guide-satisfactory"></a>

#### Gameplay field guide — Satisfactory

**What you actually do.** Like Factorio, you design production networks; unlike Factorio, you inhabit them at human scale in a three-dimensional landscape. Belts pass overhead, factories can rise vertically, and a supply route is a place you traverse. Exploration and industrial construction feed each other. [FG-SA-O](../references/sources-03.md#source-fg-sa-o)

**What the reviewed accounts value.** The reviewed appeal is both engineering and place-making: watching production work, exploiting terrain, and turning an initially unfamiliar landscape into your own readable industrial environment. The first-person view gives scale and presence to what could otherwise be a spreadsheet-like dependency graph. [FG-SA-C](../references/sources-03.md#source-fg-sa-c)

**What they dislike or find limiting.** A detailed negative Steam review from October 2024 explicitly separates liking the logistical design from disliking the labor of placing large amounts of structure and managing three-dimensional alignment. That is a particularly useful counterexample to “less manual work always means less game”: some work is the decision, while some is repeated expression of a decision already made. [FG-SA-P](../references/sources-03.md#source-fg-sa-p)

**The design tension.** Physical embodiment adds ownership but can add manipulation cost. Creator assistance should target that cost without taking over the player’s intended design.

**Watch to understand the game**

1. **[Satisfactory 1.0 Launch Trailer](https://www.youtube.com/watch?v=Jt4XOPiPJHs)** — Official gameplay/presentation trailer; 2024. Look at the relationship between landscape, machines, multi-level routing, and the player’s physical viewpoint. Compare its sense of ownership with Factorio’s overhead composition. **Caution:** A launch montage emphasizes successful builds, not the full amount of placement and troubleshooting.

**Three concrete in-game situations**

1. **Expansion has an infrastructure cost.** *Documented system interaction.* Adding a production chain also adds power demand and input/output logistics. The player cannot evaluate the new machine in isolation; supporting infrastructure must continue to function. The lesson is that a successful local invention can introduce a new system-level constraint. [FG-SA-C](../references/sources-03.md#source-fg-sa-c)

2. **A cliff becomes a design decision.** *Documented system interaction.* A distant deposit must connect to the factory. Belts, transport infrastructure, and vertical construction let players choose how to cross or work around the landscape. The same production requirement can become an elegant route or an awkward tangle, with both functional and aesthetic consequences. [FG-SA-O](../references/sources-03.md#source-fg-sa-o)

3. **You improve a place as well as a number.** *Documented player activity.* A functioning factory can be reorganized and dressed into a structure the player enjoys walking through. Its new floors and routing may make it easier to understand, but visual satisfaction can also be the purpose. That is meaningful authorship even when output per minute barely changes. [FG-SA-C](../references/sources-03.md#source-fg-sa-c)

**What to borrow for OpenLegend.** For OpenLegend, make constructed things visible, usable places and not only records of completed recipes. Offer repeat-placement or bounded delegated construction once intent is clear. Evaluate design satisfaction separately from time spent manipulating tools.

*Scope/evidence note:* Base-game systems unless noted; examples describe documented mechanics, not a play session conducted for this research.
<!-- END FIELDGUIDE ADDITION -->

