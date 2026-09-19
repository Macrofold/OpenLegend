# Recommended direction — a world that learns within clear rules

Status: **synthesis of accepted direction and remaining recommendations**. Wilderness/survival, grounded modern pixel art, and PlayCanvas with an independent custom simulation are accepted planning directions. Read the [baseline](../01-requirements/product-baseline.md) and [decision register](../05-project/open-decisions.md) for scope and unresolved choices. No implementation; other technologies and exact tuning remain unselected.

## The central design

Open Legend is feasible as a sequence of increasingly expressive simulations. The first version can deliver embodied conversation, memory, autonomous needs, shared surroundings, and a small amount of generative interaction. An indefinitely self-expanding, balanced civilization with arbitrary physics and assets is a research program, not one initial feature.

The starting setting is a primitive wilderness group with survival knowledge, accessible resources and some possessions, before a village exists. Survival mechanics should already work, and NPCs can live or die through their choices and circumstances. An accelerated world clock governs work, needs, environmental processes and aging; one real hour per day is the current tuning candidate, with creator-controlled speed changes. [Survival baseline](survival-baseline.md), [time model](time-and-simulation-speed.md)

Use a small authoritative world kernel plus a growing library of validated capabilities. Agents and people can ask for arbitrary actions. The system interprets those requests, finds an applicable known mechanism, or proposes a new bounded composition. Accepted effects update real world state; the renderer displays those effects. The world learns through the registry, while each resident separately learns what it has observed or been taught.

This architecture preserves the user's emphasis on meaning without paying for language-model adjudication of each footstep or damage tick. A semantic decision can establish a rule family; subsequent uses need fresh parameters and verified conditions. Similar language alone never proves the same outcome applies.

## Starting stack: accepted direction and proposed supporting choices

| Layer | Initial candidate | Why / limit |
|---|---|---|
| Client | **Accepted: PlayCanvas**; proposed standalone TypeScript integration and fixed elevated camera | Detailed pixel sprites/textures in a 3D scene; camera and hosted-editor use remain open; prove the visual family before broad asset production |
| World | **Accepted: independent custom simulation and generative-rule interface**; deterministic domain modules proposed | Run headlessly with its own clock; no engine objects in world state; reuse engine infrastructure without surrendering mechanics |
| Multiplayer | Colyseus adapter, one sector authority | Existing room/state transport; persistence and perception remain our responsibility |
| Persistence | PostgreSQL snapshots, event outcomes, registry and job table | Few infrastructure pieces; no standalone vector database initially |
| Cognition | Local utility/rules + bounded async LLM gateway | Parallel thoughts without blocking world updates |
| Semantic judge | Jev evaluation candidate | Bounded choices/scores; early access and own workload untested |
| Hosting | One paid regional always-on service, CDN and managed database | Render proposed under current assumptions; routing and pricing must be verified before scale |
| Voice | Text first; managed media later | Prove social value before adding speech/media cost |
| Generated mechanics | Declarative compositions of approved effects | Genuine early novelty with a smaller failure surface than arbitrary code |

PlayCanvas and the custom-simulation boundary are accepted; supporting tools and detailed integration are candidates, not installs. [Engine evidence](../02-research/engines-art-and-audio.md), [visual direction](visual-direction.md), [hosting evidence](../02-research/hosting-and-scale.md), and [Jev evidence](../02-research/jev-and-semantic-routing.md) explain limitations and alternatives.

## Answers to the hardest questions

**Can the game augment itself from inside the game?** Yes, within levels. Start by generating recipes, archetypes and timed effect compositions. Test, version, canary and retain them. Later introduce isolated algorithms with strict output contracts. Entirely new trusted primitives still go through an engineering release. [Capability lifecycle](generative-capability-lifecycle.md)

**Can it begin with only seeded fundamentals?** It can begin with a small useful set, but not no fundamentals. Define materials, resources, actions, perception, time, ownership, needs and a handful of transformation effects. The amount of expressive freedom depends on those primitives. A new word such as “electricity” cannot create an electrical simulator unless the requisite rules are added.

**Does fire, hearing, light or destruction require Unreal?** Simple credible versions do not. Logical material/rate rules, sound attenuation queries, visibility, and integrity stages can be separate from graphical effects. True physical fracture or cinematic fidelity may justify different tools later. Browser Unreal via Pixel Streaming also changes operating costs and delivery architecture. [Engine research](../02-research/engines-art-and-audio.md)

**How do we make the pixel art compelling?** The accepted direction is detailed, grounded pixel art with 3D structure and modern atmosphere. A fixed-camera sprite family is the proposed first test, not a locked camera decision. Author the palette, proportions, textures, lighting and motion deliberately; a pixelation filter alone is insufficient. Consistent angles, outfits and animation remain production work. [Visual brief and proof](visual-direction.md)

**Does owning generative mechanics require our own graphics engine?** No. Own the simulation, clock and scripting interface while reusing PlayCanvas's graphics, animation, audio, input and asset infrastructure. Unity also permits custom simulation; RimWorld uses its own object/time systems on Unity. Generated data and runtime executable algorithms have different validation/execution paths regardless of renderer. [Architecture boundary](system-architecture.md#own-the-simulation-reuse-engine-infrastructure), [generation levels](generative-capability-lifecycle.md)

**Can 100 agents think concurrently?** Yes as an architectural pattern: bounded jobs read versioned observations in parallel and return proposed actions. The sector validates and commits them in order, resolving conflicts. Concurrency reduces waiting; it does not reduce the number of paid calls by itself. [Shared-state architecture](system-architecture.md)

**How useful is Jev?** Its documented role fits small semantic judgments. It is not a dialogue generator, world-memory database or script generator. Published latency/cost claims need game-specific evaluation, and deterministic code still enforces arithmetic and invariants. Keep an adapter and fallback. [Jev research](../02-research/jev-and-semantic-routing.md)

**Can institutions and technology emerge?** Plausibly from persistent communication, shared projects, resources, skills and obligations. The application must supply usable affordances and enough scarcity/opportunity. An LLM saying “we have a government” is not a functioning institution until membership, commitments and authority have defined effects. A discovered technology can extend a dependency graph without a pre-authored complete tech tree. [World systems](world-and-player-experience.md)

## The first proof should be human-scale

Build a few people in the wild, dependable gathering/eating/resting, an explicit accelerated clock, consequential needs and death, remembered promises, and one reusable invention. A new carrying-bundle recipe can demonstrate generation using available cord, material and carrying primitives. Basic campfire and shelter behavior should be seeded if the survival scenario depends on them. Novel burning contexts or a helmet strike can later test conditional effect resolution. The earlier door-wedge example remains a possible later test once built doors exist; it no longer defines the initial scenario.

The largest product uncertainty is whether residents remain interesting and coherent over repeated sessions. The largest technical uncertainty is whether new mechanisms generalize safely within useful bounds. The largest business uncertainty is how much real interaction costs at the usage level players want. The [roadmap](../05-project/roadmap.md) and [research backlog](../05-project/research-backlog.md) place these questions ahead of scale and feature count.
