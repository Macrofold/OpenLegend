# Comparative capability and decision matrices

| Research status                  | Progress                                                                                                 | Last updated |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------ |
| Completed qualitative comparison | Summarizes documented route differences without inventing benchmark scores or universal capacity limits. | 2026-10-15   |

## How to read the matrices

“Available” means a documented mechanism exists, not that Open Legend implements it or that it meets a target. “Custom” means integration or development work remains, not impossibility. “Qualified” means a feature depends on the exact release, renderer, hardware, plugin or platform approval. These tables summarize the linked dossiers; their sources and caveats remain part of each conclusion.

No numeric engine score is provided. Assigning arbitrary 9/10 performance ratings would conceal unknown workloads and subjective priorities behind false precision.

## 1. Primary route comparison

| Route                                                | Strongest practical argument                                         | Principal cost or limitation                                           | Evidence that would justify choosing it                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [PlayCanvas web](engines/playcanvas.md)              | Game-oriented browser runtime plus rich web application integration  | Browser budgets and more ownership of advanced production tooling      | Required scene and creator journey fit target devices and access benefits matter     |
| [Babylon.js web](engines/babylonjs.md)               | Broad graphics/inspection/visual-authoring facilities in a web stack | Migration and dynamic-scene tuning; native preview is separate         | Specific required feature or workflow demonstrably improves                          |
| [Three.js web](engines/threejs.md)                   | Freedom to construct a specialized presentation architecture         | Team assembles more surrounding game-client systems                    | Custom architecture has a concrete advantage over fuller engines                     |
| [Unity native/URP](engines/unity.md)                 | Balanced native tooling, graphics and data-oriented options          | Proprietary rights/terms and pipeline/package complexity               | Performance and production benefits justify a resolved licensing arrangement         |
| [Unity web](engines/unity.md)                        | Unity authoring with web distribution                                | Not native/HDRP parity; release-specific threading and graphics limits | Shared production workflow outweighs startup/integration constraints                 |
| [Unreal native](engines/unreal.md)                   | Specialized high-end rendering, animation and world tooling          | Runtime-generation, hardware, integration and licensing burdens        | Required embodied/high-fidelity experience benefits substantially                    |
| [Godot native](engines/godot.md)                     | Open engine, integrated editor and runtime content flexibility       | Required crowd scale and specialist tools need qualification           | Meets sustained performance and creation targets without major custom infrastructure |
| [Godot web](engines/godot.md)                        | Shared Godot workflow for a reduced browser target                   | Compatibility/WebGL 2 path; no documented Godot 4 C# web export        | The required browser experience fits this narrower target                            |
| [Babylon Native](engines/babylonjs.md)               | Native rendering route with Babylon-oriented code                    | Public preview; exact host/platform feature qualification              | Real packaged journey proves a reliable advantage                                    |
| [Cloud-streamed Unreal](platforms-and-deployment.md) | High-end remotely rendered experience on modest clients              | GPU/encoding/egress cost and network-dependent responsiveness          | User value covers sustained session cost and latency                                 |

## 2. Performance questions that change the winner

| Workload                                     | Browser-first implication                                  | Native-engine implication                                      | What not to infer                                        |
| -------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------- |
| Many stored objects and long histories       | Primarily a server/storage problem                         | Still a server/storage problem if authority is unchanged       | Native graphics automatically enlarges world capacity    |
| Many nearby interacting characters           | Efficient scoped delivery and client representation needed | More implementation options, but real interaction work remains | ECS or C++ makes quadratic interaction free              |
| Dense personalized animated crowd            | CPU animation, bounds, materials and GPU cost can dominate | Mature native/data-oriented facilities may help                | A repeated-static-mesh demo proves animated crowd scale  |
| Dense foliage, smoke and transparent sprites | Overdraw and shadow passes can dominate                    | Same hardware costs remain, with different tools               | Low polygon counts guarantee fast frames                 |
| Large mostly static scenery                  | Instancing, culling, LOD and streaming can work well       | Integrated authoring/streaming may reduce production work      | World size equals simultaneously resident geometry       |
| Frequently changed structures                | Correct cache/navigation/visibility invalidation essential | Precomputed native optimizations also need invalidation        | A static-scene benchmark represents live building        |
| Rich inventories and invention review        | HTML tools can be a major productivity advantage           | Native UI requires deliberate replacement/integration          | A gamepad API makes every screen controller-friendly     |
| Long mobile/handheld sessions                | Thermal and memory behavior must be measured               | Also constrained by heat, power and device memory              | A cold flagship run qualifies sustained minimum hardware |

## 3. Graphics and effects: where limits really appear

Common raster techniques—lit meshes, textures, animation, shadows and many post-process effects—are not exclusive to native engines. The practical separation increases with advanced lighting, specialized geometry/animation pipelines, complex effects authoring and hardware-specific facilities. The browser's GPU access is real; native integrated tools can still give a higher practical ceiling or cheaper production path.

| Feature family                           | Web-native engines                                               | Unity                                                       | Unreal                                                        | Godot                                                               |
| ---------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------- |
| Ordinary stylized 3D/PBR/animation       | Documented engine paths; test actual assets                      | URP/HDRP and target-dependent choices                       | Native engine paths                                           | Renderer-dependent native/web paths                                 |
| General GPU compute                      | WebGPU-capable path; fallback may differ                         | Native and supported web/backend constraints                | Native facilities                                             | Modern native renderers; not current web Compatibility route        |
| High-end integrated lighting/reflections | Custom/engine-specific approximations; no universal parity claim | HDRP features do not transfer to web                        | Lumen and other specialized systems                           | Forward+ features exceed Compatibility                              |
| Specialized dense geometry pipeline      | Engine-specific batching/LOD/streaming work                      | Pipeline/package-specific tools                             | Nanite, including documented 5.8 skeletal support with limits | LOD, culling and representation work; not assumed Nanite-equivalent |
| Transparent smoke/hair/foliage           | Pixel/overdraw and sorting costs                                 | Costs remain                                                | Costs remain; Nanite does not make all transparency free      | Costs remain                                                        |
| Runtime newly generated model            | Supported-loader/format profile needed                           | glTFast or another qualified route; prepared bundles differ | Runtime Interchange has route-specific restrictions           | Documented runtime loading; profile/performance still needed        |

These are mechanism comparisons, not a visual-quality ranking or complete feature catalogue. See each engine dossier for primary sources. A supported feature may be too expensive at the required quality, and a custom implementation may be viable despite lacking a convenient checkbox.

## 4. Controls, networking and distribution

All primary routes can support ordinary game controls through their available input systems. The distinctions are device-specific features, native SDK access, complete UI design and platform qualification. Browser transports can support serious real-time play; native engines offer different protocol and integration options. Neither route exempts the server from validating intentions and protecting private information.

| Requirement                                                      | Implication for selection                                                                     |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Basic gamepad movement and actions                               | Not by itself a reason to leave the browser                                                   |
| Advanced haptics or specialized peripherals as required features | Strengthens the case for a qualified native integration                                       |
| Complete controller-only invention and conversation              | UI/text-entry design remains substantial in every engine                                      |
| First-release console distribution                               | Favors early native platform/rights qualification; engine approval is not game certification  |
| Instant browser access as a hard requirement                     | Favors PlayCanvas/Babylon; native web exports need separate evaluation                        |
| Independent self-hosted worlds                                   | Retain explicit control over authority, data and distribution rights                          |
| Offline play with live AI features                               | Separate local-services/model capability question, not solved by a native renderer            |
| Maximum portability with minimal custom tools                    | Often conflicts with highest-end renderer-specific features; choose required tiers explicitly |

## 5. Licensing and production sensitivity

With current AGPL policy retained, permissive engine components are easier starting points than proprietary combined runtimes, subject to actual component and platform review. With that constraint deliberately resolved or changed by the rights holders, Unity's balanced native case becomes stronger. With cutting-edge presentation elevated to a hard requirement, Unreal's case strengthens. With browser access made mandatory, native-only advantages cannot decide the primary route.

These are visible changes in assumptions, not contradictions. [The unified assessment](open-legend-assessment.md) gives a recommendation under the known goals, explains the strongest counterargument and names evidence that would overturn it.
