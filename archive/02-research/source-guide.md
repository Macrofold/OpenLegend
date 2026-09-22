# Research guide and source provenance

Sources checked September 18, 2026 (America/New_York), with research continuing September 19 UTC. Primary official documentation and original research were preferred. Inline citations in each document are the detailed evidence record; this page is the navigation index.

No game was played for this research, no vendor API was benchmarked, no hosting capacity was tested, and no psychological model was validated in Open Legend. Official documentation establishes stated behavior/constraints; vendor performance numbers remain vendor claims. Historical development articles and papers are explicitly dated. Proposed designs, numerical examples and suitability judgments are original analysis.

## Research documents

| Document | Questions answered | Main remaining uncertainty |
|---|---|---|
| [Games and emergence](games-and-emergence.md) | RimWorld systems/DLCs, Dwarf Fortress, Sims, Minecraft/Runescape business inspiration | How these patterns feel in real-time embodied multiplayer |
| [Human models and memory](human-models-and-memory.md) | Generative Agents, personality dimensions, emotions/appraisal, bounded memory and perception | Which small abstraction produces enjoyable continuity |
| [Jev and routing](jev-and-semantic-routing.md) | Public interface, limits, pricing claims, failure modes, reuse boundaries and evaluation | Actual performance, access and terms for this workload |
| [Engines, art and audio](engines-art-and-audio.md) | Selected PlayCanvas direction, licensing/maintenance and production precedents; alternative engines, art-production tradeoffs, custom simulation and environment/voice abstractions | Desired visual quality, reference-device performance and repeatable asset production remain untested |
| [Hosting and scale](hosting-and-scale.md) | Host shortlist, multiplayer ownership, media permissions, persistence and costs | Measured density, regional performance, total operating cost |
| [Macrofold workspaces](macrofold-workspaces.md) | Sibling repository's persistence, memory starter, execution boundaries, billing defaults and fit for NPC minds | Measured NPC latency/cost, recall quality, and whether full workspaces improve behavior |

Follow-up synthesis: [native survival](../03-design-proposals/survival-baseline.md) adds concrete plant-fiber examples and the primitive starting scenario; [time and speed](../03-design-proposals/time-and-simulation-speed.md) develops the user's accelerated-time proposal using explicit arithmetic and untested design hypotheses. The earlier small-village research examples are precedents or superseded scenario suggestions, not the current starting-world decision.

[Agency, cognition and planning](agency-cognition-and-planning.md) collects primary sources and bounded design inferences for optional decisions and persistent native pursuit. Its source-access notes are specific to that review; game behavior and cost remain unmeasured.

## Selected primary sources by topic

These links point to sources actually reviewed in the research. Further specific pages are cited inline; selection here does not imply every source supports every recommendation.

| Topic | Primary sources | What they support |
|---|---|---|
| RimWorld broad systems | [Official overview](https://rimworldgame.com/), [Alpha 10 needs](https://ludeon.com/blog/2015/04/rimworld-alpha-10-joy-system-released/), [Alpha 6 anatomy](https://ludeon.com/blog/2014/08/alpha-6-whole-new-world-released/) | Current overview plus historical design details, not current tuning values |
| RimWorld lifecycle and culture | [Biotech](https://rimworldgame.com/biotech/), [Ideology](https://rimworldgame.com/ideology/) | Expansion-specific scope |
| Concrete fiber resources | [NPS grasses/cordage](https://www.nps.gov/nepe/learn/nature/grasses.htm), [NPS yucca fibers](https://www.nps.gov/pisp/planyourvisit/lifeways-environment.htm), [NPS bark fiber](https://home.nps.gov/articles/osage-apple-orange.htm) | Examples of useful plant material; not all grasses are equivalent and biomes differ |
| Persistent simulation | [Dwarf Fortress official features](https://bay12games.com/dwarves/features.html) | Systems and moddable definitions, with legacy presentation caveat |
| Game membership patterns | [Minecraft Realms](https://www.minecraft.net/en-us/realms), [Jagex memberships](https://support.runescape.com/hc/en-gb/articles/43699154194705-Managing-Subscriptions) | Packaging inspiration, not Open Legend unit economics |
| Generative-agent research | [Generative Agents paper](https://arxiv.org/html/2304.03442v2), [authors' implementation](https://github.com/joonspk-research/generative_agents) | Memory/reflection/planning precedent and experimental limits |
| Reusable generated skills | [Voyager official repository](https://github.com/minedojo/voyager) | Growing executable skill library in an existing game |
| Personality | [BFI-2 study](https://escholarship.org/uc/item/16x6n05t), [facet change study](https://pubmed.ncbi.nlm.nih.gov/36325745/) | Dimensional vocabulary and stability/change research |
| Emotion | [Cowen and Keltner](https://doi.org/10.1073/pnas.1702247114), [Scherer appraisal account](https://doi.org/10.1080/02699930902928969), [Barrett theory](https://academic.oup.com/scan/article/12/1/1/2823712) | Different research perspectives, not one settled meter taxonomy |
| Jev interface and constraints | [Quickstart](https://docs.typesafe.ai/introduction/quickstart), [models](https://docs.typesafe.ai/models), [limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13) | Vendor-documented API, current model claims and admitted limitations |
| Jev launch and evaluation | [Announcement](https://typesafe.ai/blog/introducing-system-one-models-and-jev), [evaluation methodology](https://evals.typesafe.ai/) | Early access and vendor measurements, not independent game results |
| Browser-native graphics | [Babylon capabilities](https://www.babylonjs.com/specifications/), [Three renderer guide](https://threejs.org/manual/pages/webgpurenderer), [PlayCanvas graphics](https://developer.playcanvas.com/user-manual/graphics/) | Engine facilities and documented renderer maturity |
| PlayCanvas licensing and support | [Engine](https://github.com/playcanvas/engine), [editor frontend announcement](https://blog.playcanvas.com/playcanvas-editor-frontend-is-now-open-source/), [plans](https://playcanvas.com/plans), [releases](https://github.com/playcanvas/engine/releases) | MIT engine/frontend, distinction from hosted service, current plans and maintenance evidence; no SLA or subscription commitment |
| PlayCanvas production precedents | [2021 showcase](https://blog.playcanvas.com/playcanvas-showcase-2021/), [2022 showcase](https://blog.playcanvas.com/our-2022-developer-showreel-is-live/), [Ready Chef Go customer case study](https://www.pickfu.com/case-studies/mojiworks-ready-chef-go) | Published games and attributed historical reach; not current concurrency or a pixel-art production template |
| Pixel-art visual references | [Songs of Conquest](https://www.songsofconquest.com/), [Octopath Traveler II](https://www.square-enix-games.com/en_US/home/octopath-traveler-ii-ochette-castti-character-trailer) | Aesthetic references, not claims of browser delivery or PlayCanvas implementation |
| Custom simulation on a general engine | [Ludeon technical FAQ](https://ludeon.com/blog/faq/), [Unity scripting backends](https://docs.unity.com/en-us/engine/6000.0/manual/scripting/compilation-and-code-reload/script-compilation/backends) | RimWorld's own object/time systems on Unity; compile/runtime distinctions for new executable logic |
| Web export | [Godot web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html), [Unity 6.0 web limitations](https://docs.unity3d.com/6000.0/Documentation/Manual/webgl-technical-overview.html) | Browser/export constraints for the cited versions |
| Unreal delivery | [Pixel Streaming overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-pixel-streaming-in-unreal-engine), [hosting guide](https://dev.epicgames.com/documentation/en-us/unreal-engine/hosting-and-networking-guide-for-pixel-streaming-in-unreal-engine) | Remote rendering model and infrastructure responsibilities |
| Art interchange | [Aseprite sprite sheets](https://www.aseprite.org/docs/sprite-sheet/), [Khronos glTF](https://www.khronos.org/gltf/) | Asset packaging and delivery formats |
| Browser spatial sound | [PannerNode](https://developer.mozilla.org/en-US/docs/Web/API/PannerNode), [microphone capture](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) | Platform audio facilities and permission requirements |
| Multiplayer authority | [Colyseus state](https://docs.colyseus.io/state), [scaling](https://docs.colyseus.io/scalability), [Nakama authoritative multiplayer](https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/) | Room/server ownership and scaling boundaries |
| Hosts | [Render WebSockets](https://render.com/docs/websocket), [Railway networking](https://docs.railway.com/networking/public-networking/specs-and-limits), [Fly machine routing](https://fly.io/docs/blueprints/connecting-to-user-machines/), [Colyseus Cloud](https://docs.colyseus.io/cloud) | Practical service and routing constraints |
| Media | [LiveKit subscriptions](https://docs.livekit.io/transport/media/subscribe/), [publishing permissions](https://docs.livekit.io/transport/media/publish/), [distributed self-hosting](https://docs.livekit.io/transport/self-hosting/distributed/) | Media routing, permissions and deployment limits |
| Structured validation | [JSON Schema object validation](https://json-schema.org/understanding-json-schema/reference/object) | Structural validation, not semantic correctness |
| Generated-code isolation | [Node VM](https://nodejs.org/api/vm.html), [Wasmtime interruption](https://docs.wasmtime.dev/examples-interrupting-wasm.html), [Wasmtime configuration](https://docs.wasmtime.dev/api/wasmtime/struct.Config.html) | Unsafe shortcut to avoid; isolation resource-control ingredients |
| Durable transactions | [PostgreSQL isolation](https://www.postgresql.org/docs/17/transaction-iso.html) | Concurrency behavior and retry responsibility |
| Structured memory retrieval | [PostgreSQL full-text search](https://www.postgresql.org/docs/current/textsearch.html), [pgvector](https://github.com/pgvector/pgvector) | Candidate indexing facilities; no Open Legend schema or retrieval quality tested |
| Macrofold memory/runtime | [Local memory guide](../../../AgentCloud/docs/features/customer-agents/memory.md), [workspace implementation](../../../AgentCloud/docs/features/workspaces/implementation.md), [billing defaults](../../../AgentCloud/docs/features/billing/README.md) | Inspected working-tree behavior and configurable defaults, not a hosted quotation |
| Sandbox vendor cost | [Vercel Sandbox pricing](https://vercel.com/docs/sandbox/pricing) | Provider CPU/memory billing dimensions, distinct from Macrofold retail charges |

## Revalidation triggers

Recheck providers before integration, pricing, procurement or public claims. Pin actual library/model versions after selecting them. Recheck browser-export limitations against the chosen engine release rather than treating a rolling stable page as a permanent contract. Retain an experiment's exact configuration with its results.

The [research backlog](../05-project/research-backlog.md) tracks access questions, experiments, and evidence needed for decisions. Unreadable/dynamic information is identified where relevant; it has not been filled in with guessed prices or features.
