# PlayCanvas, Godot, and the engine decision for OpenLegend

**Research date:** 17 October 2026. **Reviewed:** 17 October 2026. **Status:** proposed recommendation within the accepted browser-only product direction, not an engine decision or a migration plan accepted by the project.

## Recommendation

Keep PlayCanvas as the current production default and improve the asset, lighting, animation, UI, and visual-review workflows around it. Run a bounded comparison with Godot or another authoring environment when it can answer a specific question about visual iteration, animation, scene assembly, contributor access, or browser delivery. A useful experiment does not require first proving that PlayCanvas prevents a feature. OpenLegend's accepted distribution remains browser-only; assess alternatives against the [platform and offline decision](../../../docs/projects/completed/platform-and-offline-decision-brief.md).

This recommendation follows OpenLegend's existing architecture and immediate gameplay priorities. It is not a claim that PlayCanvas is universally superior. The project already has a renderer-independent authoritative world, a browser client, direct PlayCanvas scene code, React interfaces, and substantial presentation work. Its next goal is a convincing playable loop in which survival needs lead to useful invention and independent characters create consequences. Rebuilding the client must earn its place against that work. See [architecture](../../../docs/architecture.md), [engine and world boundaries](../../../docs/engine-and-world-boundaries.md), and [gameplay priorities](../../../docs/repertoires/gameplay-priorities.md).

The linked skills catalog is not evidence that we chose the wrong engine. PlayCanvas has an official collection with more relevant instructions than that catalog's omission suggests.

## What the missing catalog entry actually means

At the inspected revision, [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/tree/0a70cfc64672d512c5b5b6006b5dcb5cf90dbdbd) contains 74 skills across its selected engines, disciplines, genres, and workflows. Its router recognizes those engines, but not PlayCanvas. When a new project has no engine preference, the router defaults to Godot because Godot has the collection's fullest coverage. That is an explicit statement about the collection's contents, not a comparative study of game engines. The maintainer's public profile is [Abhishek Barali](https://github.com/AbhishekBarali); this review did not establish a shipped-game record or independent production benchmark for the catalog. [Router source](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/0a70cfc64672d512c5b5b6006b5dcb5cf90dbdbd/router/SKILL.md).

GitHub metadata puts the catalog's creation on 24 June 2026, and the official PlayCanvas skills repository's creation on 4 August 2026. Both were updated in October. These dates offer a plausible discovery or coverage explanation; they do not prove the maintainer's reason for the omission. Only the maintainer could settle that. [Catalog metadata](https://api.github.com/repos/gamedev-skills/awesome-gamedev-agent-skills), [PlayCanvas skills metadata](https://api.github.com/repos/playcanvas/skills).

The [official PlayCanvas skills repository](https://github.com/playcanvas/skills/tree/38d8fa75ab56d628dc2dac7daea5383aee783903) has 16 actual skill files covering application conventions, official examples and reusable scripts, GLB inspection, model calibration, animation, asset loading, lighting, effects, runtime inspection, image verification, draw calls, shader modifications, and baking. They support code-based Engine, React, and web-component workflows. They are authoring instructions and helper scripts, not a new runtime dependency. See [the official guide](https://developer.playcanvas.com/user-manual/getting-started/use-playcanvas-skills/) and the [tooling review](04-skills-and-tooling.md).

One compatibility detail matters immediately: OpenLegend pins PlayCanvas **2.22.2**, while the current official `inspect-runtime` skill requires **2.23 or newer**. If the inspector would resolve a useful scene problem, include the engine update and regression risk in the proposed trial. Tool availability alone does not establish the benefit of that update. [Client dependencies](../../../apps/client/package.json), [runtime inspection skill](https://github.com/playcanvas/skills/blob/38d8fa75ab56d628dc2dac7daea5383aee783903/skills/inspect-runtime/SKILL.md).

## Start from the engine arrangement we actually have

OpenLegend uses the standalone PlayCanvas Engine directly. `scene.ts` imports PlayCanvas and implements the wilderness presentation; the client package uses React and React Aria but does not depend on `@playcanvas/react`. Thus “React versus PlayCanvas” is the wrong distinction for this client: React renders the surrounding interface, and PlayCanvas renders the world. [Client dependencies](../../../apps/client/package.json), [scene implementation](../../../apps/client/src/scene.ts).

The scene includes lit camera-facing sprites, actual 3D scenery, shadows, and a mercenary model path. It would be inaccurate to describe every 3D capability as hypothetical. The broader [3D pixel-art feature proposal](../../../docs/projects/3d-pixel-art-feature-spec.md) and [asset-pipeline proposal](../../../docs/projects/3d-pixel-art-asset-pipeline.md) set out additional staged work; their ambitions should not be confused with everything already delivered.

The world renderer receives an observer-visible game view, exposes camera and presentation controls, and returns player intentions. It is deliberately a small application boundary, not an abstraction that makes every rendering API interchangeable. Navigation and physical shape queries are server concerns; camera placement, shadows, model animation, and hover outlines are presentation concerns. A generic engine skill that introduces client-authoritative physics or discovers collision from art would violate those existing boundaries. [Renderer interface](../../../apps/client/src/world-renderer.ts), [world boundaries](../../../docs/engine-and-world-boundaries.md).

This arrangement is useful for the AI-generated world: assets and dialogue can enrich the presentation without becoming new authorities over what exists or what the observer may know. Any engine comparison has to preserve that property.

## Does browser UI explain why our inventory looks worse?

There is no evidence in this research that a browser prevents the illustrated icons, elaborate frames, readable slots, and responsive interaction seen in polished game inventories.

PlayCanvas explicitly supports HTML/CSS overlays in code-based applications and describes the advantages of DOM text, forms, web fonts, and accessible controls. Its guide also explains pointer routing between the interface and canvas and projecting world positions into DOM coordinates. Standard CSS has image-based border slicing; authored frames do not require a native game-engine UI system. [PlayCanvas UI overview](https://developer.playcanvas.com/user-manual/user-interface/), [HTML/CSS integration](https://developer.playcanvas.com/user-manual/user-interface/html-and-css/), [MDN border-image](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/border-image).

That establishes capability, not automatic quality or unlimited performance. Many translucent overlays, expensive effects, unnecessary DOM work, and poor input coordination can still degrade a browser game. The relevant question is whether our actual interface has those problems, measured in the complete running client. Switching engines before that diagnosis changes too many variables.

OpenLegend already has a design system and current design direction: a world-first interface, item-centered inventory, restrained forest/ivory/sage/gold colors, a distinction between utility icons and world art, and accessible interaction components. The hypothesis to investigate is inconsistent execution and insufficient shared visual references, assets, and review, rather than the absence of all design guidance. [Current UI brief](../../../docs/ui-design-brief.md), [UI foundations](../../../docs/ui-ux/foundations.md), [inventory](../../../docs/ui-ux/inventory.md), [client design system](../../../apps/client/src/design-system/README.md).

The current UI brief also supersedes older transcript-oriented descriptions. An imported fantasy dashboard template that crowds out the world would fail this brief even if its borders were beautiful.

A fair engine-independent experiment should give the existing browser implementation a real art brief: the same inventory contents, approved icon family, frame assets, typography, spacing, states, and screenshot targets. Evaluate the final interface over the actual scene, including focus, selected and disabled items, long names, empty slots, interaction feedback, and narrow layouts. This isolates whether our bottleneck is asset direction, layout, implementation, or review. A video showing a different model, different art inputs, different budget, and different game cannot isolate an engine effect.

Coherent Labs provides a particularly relevant counterexample to simplistic “web technology cannot look like game UI” reasoning: its game-interface authoring system uses HTML/CSS concepts, a documentation corpus, explicit requirements, and live inspection. Its renderer supports a subset of browser CSS, so its restrictions must not be copied into our actual browser. The useful finding is that the vendor attributes visual coherence to design inputs and verification as well as tools. [Coherent Labs AI workflow](https://guide.coherent-labs.com/building-with-ai/overview/).

## Where Godot would help

Godot is a credible option with shipped games, not a fallback for unsuccessful developers. Its official showcase includes titles such as Cassette Beasts, Dome Keeper, Brotato, and Halls of Torment. That demonstrates real production use; it does not establish that their native-game requirements, performance, or workflows transfer directly to this browser application. No sales totals are inferred from that listing. [Godot showcase](https://godotengine.org/showcase/).

Its strongest relevant advantages are integrated visual authoring and game-oriented resources:

| Area                | What Godot supplies                                                                                            | Why it could matter to OpenLegend                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interface authoring | Reusable Theme resources with fonts, icons, colors, style boxes, and live preview of controls and states.      | A designer can inspect an inventory family inside one editor. This is an authoring advantage, not a guarantee of better illustration or hierarchy. |
| Animation           | AnimationPlayer resources plus AnimationTree state machines, blend trees, blend spaces, and one-shot playback. | Complex authored character motion can be reviewed and adjusted visually. Good imported rigs and clip contracts remain necessary.                   |
| Scene composition   | The scene/node model and reusable imported scenes used by the animation and UI workflows.                      | An editor-centered team can organize authored scenes without expressing every placement in application code.                                       |
| Agent integration   | Community tools can launch projects, operate on scenes, and inspect errors.                                    | Helpful if Godot becomes the chosen authoring environment; tool availability alone does not pay migration cost.                                    |

Sources: [Theme editor](https://docs.godotengine.org/en/stable/tutorials/ui/gui_using_theme_editor.html), [AnimationTree](https://docs.godotengine.org/en/stable/tutorials/animation/animation_tree.html), [Godot MCP source](https://github.com/Coding-Solo/godot-mcp), [tooling review](04-skills-and-tooling.md).

These are useful reasons for a focused prototype whenever the expected authoring benefit warrants its cost. An offline Godot or Material Maker experiment can also produce ordinary textures or assets for PlayCanvas. Keep that authoring choice separate from a decision to replace the browser runtime.

### Godot's current web tradeoffs

The current stable export documentation specifies WebAssembly and WebGL 2 with the Compatibility renderer, not the Forward+ or Mobile renderers. Godot 4 C# projects cannot currently export to the web. Single-threaded export has been available since 4.3 and is now the default; optional threading and extensions bring cross-origin-isolation requirements. Browser audio offers a low-latency sample path with feature limits and a stream path with different latency tradeoffs. Browser networking also has platform constraints. These must be checked on the chosen export, browser, and device. [Godot web export documentation](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html).

It is therefore inaccurate both to say “Godot cannot run in a browser” and to imply that all native Godot capabilities transfer unchanged to the web. This research did not measure its download, startup, memory, frame time, or audio latency against OpenLegend. No numerical performance ranking is justified.

Godot can communicate with JavaScript through JavaScriptBridge, including callbacks and external libraries. Keeping a React interface around a Godot canvas is possible. It introduces an explicit communication boundary, callback lifetime and value conversion concerns, and two presentation systems to package and verify. It does not make the interface redesign free. [JavaScriptBridge](https://docs.godotengine.org/en/stable/tutorials/platform/web/javascript_bridge.html).

## PlayCanvas's relevant strengths and limits

The standalone Engine is a JavaScript library with TypeScript declarations, distributable through npm, and separate from the hosted Editor. Its current graphics documentation lists PBR materials, image-based lighting, shadows, lightmaps, postprocessing, instancing, and texture compression; it labels WebGPU support **beta** with WebGL 2 fallback. This is sufficient evidence to investigate a lighting or material workflow inside our existing engine. It is not evidence that every feature is present or equally stable in our pinned release. [Engine introduction](https://developer.playcanvas.com/user-manual/engine/), [graphics documentation](https://developer.playcanvas.com/user-manual/graphics/).

The practical benefits for us are continuity of the browser/TypeScript stack, direct access to browser inspection, retained DOM accessibility, and an existing presentation implementation. Those are project-specific cost and integration advantages. They do not establish better frame rates, cheaper memory, or better visual output without measurement.

The official Editor MCP server is another option, but it controls a project open in the PlayCanvas Editor, not an arbitrary standalone application. It can edit scenes/assets and verify viewport and launched results. Those actions modify the connected Editor project directly; there is no local source push step for them. Introducing the Editor would be an authoring-workflow decision, with its own ownership and source synchronization questions. It is not a prerequisite for using the Engine skills in our repository. [Editor MCP documentation](https://developer.playcanvas.com/user-manual/editor/mcp-server/).

## Unity and Unreal in this decision

Unity and Unreal offer substantial editor ecosystems, but neither is a justified shortcut from “the inventory looks wrong” to “replace the engine.” An editor demo, asset-store package, or MCP tool demonstrates an available workflow; it does not show that our complete world, browser interface, and observer boundaries move intact.

Unity's current 6.6 web documentation is more nuanced than older blanket claims that web builds cannot use multiple threads. It distinguishes unsupported managed C# threads from supported native engine threads and Burst-compiled C# jobs. It also documents browser networking, audio, and API restrictions. The lesson from the supplied Project Tomorrow video—shared systems, reuse, and data-oriented processing—can be adopted where profiling supports it without assuming either that all browsers are single-threaded or that Unity DOTS must replace our server architecture. [Unity 6.6 web limitations](https://docs.unity3d.com/6000.6/Documentation/Manual/webgl-technical-overview.html).

The official Unreal browser route investigated here is Pixel Streaming: an Unreal application runs on a host and sends rendered frames/audio to browser clients, which send input back. That can serve demanding visuals, but it moves rendering to hosted infrastructure and introduces transport latency and session-capacity work. It is not equivalent to distributing the current client to render locally in each player's browser. [Epic Pixel Streaming overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/pixel-streaming-in-unreal-engine), [infrastructure](https://dev.epicgames.com/documentation/unreal-engine/pixel-streaming-infrastructure).

Deep editor tooling or authored cinematics can justify an authoring comparison, but native-only advantages do not satisfy OpenLegend's accepted browser-only distribution. Any proposal to change that product decision belongs with its [existing owner](../../../docs/projects/completed/platform-and-offline-decision-brief.md). The cited clone video's UI supplies no such argument.

## What migration would actually require

The authoritative TypeScript world may remain largely reusable behind the existing interfaces, but the current renderer boundary is not a ready-made Godot implementation. At minimum, a migration investigation would account for:

- Scene construction, model loading, material setup, and resource cleanup.
- World camera behavior, picking, targeting, construction previews, and pointer routing.
- Lit sprites, relief effects, read-through visibility, shadows, day/night presentation, and actual 3D models.
- Animation graphs, clip binding, asset scale/pivot conventions, and export round trips.
- React/engine data exchange or a deliberate UI rewrite.
- Browser packaging, loading, device behavior, and diagnostics.
- Reverification that hidden entities, internal agent thoughts, and authoritative mechanics remain outside presentation authority.

This list comes from the responsibilities visible in [the current scene](../../../apps/client/src/scene.ts), [renderer interface](../../../apps/client/src/world-renderer.ts), [world-presentation contract](../../../docs/world-presentation.md), and [engine boundaries](../../../docs/engine-and-world-boundaries.md). No calendar or cost estimate is supplied because no port has been scoped or executed.

## Proposed decision experiment and revisit criteria

Develop the PlayCanvas slice while investigating engine-specific uncertainties at the scale needed to resolve them. A small authoring or export experiment can run before the complete slice when it answers an important question cheaply. Define the intended visual or player-experience improvement, the task to reproduce, and the output needed by the browser game.

Compare the **same representative task** using the same source assets, visual intent, permitted world view, camera, target device, and interactions. Inspect both creation and revision: a workflow that makes the first scene easy may make later changes difficult, or the reverse. Record setup, export, browser integration, corrections, loading, frame-time behavior, and maintenance effort. An editor-only result can demonstrate an authoring capability; a runtime claim requires the delivered browser result.

A switch becomes credible when representative evidence shows a material, persistent authoring or player-experience benefit that outweighs integration, replacement, and continuing maintenance work while meeting browser delivery needs. Catalog coverage, generated screenshots, star counts, and a different game's success can suggest investigations; they do not establish that net benefit.

The proposed immediate choice is to improve the current workflow while keeping useful alternatives testable. The tool survey supplies concrete candidates, and a successful offline authoring experiment can be adopted without changing the production engine.
