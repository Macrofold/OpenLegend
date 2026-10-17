# Skills and tooling worth evaluating for OpenLegend

**Research date:** 17 October 2026. **Status:** proposed adoption plan. No skill, plugin, executable, model service, or editor integration was installed or activated during this review.

## What is most useful now

The best immediate candidates are the official PlayCanvas asset/lighting/animation skills, Adobe's React Aria documentation skill, Microsoft's browser inspection workflow, a disciplined asset-family workflow, and a small Blender preparation/verification pipeline. They address the stack and production problems OpenLegend already has. An engine migration, an all-purpose agent router, or many overlapping editor bridges would add work before establishing a benefit.

The selection follows the [current UI brief](../../../docs/ui-design-brief.md), [art direction](../../../docs/maintainers/art-direction.md), [world presentation](../../../docs/world-presentation.md), [3D asset proposal](../../../docs/projects/3d-pixel-art-asset-pipeline.md), and [gameplay priorities](../../../docs/repertoires/gameplay-priorities.md). The target is a convincing survival-adventure slice and a repeatable supply of coherent assets, not the largest possible tool installation.

This review inspected the supplied catalog, actual skill files, helper-script paths, repository metadata, official engine documentation, and selected editor adapters. It distinguishes four things often mixed together:

| Kind | What it contributes | What it does not establish |
| --- | --- | --- |
| Agent skill | Reusable instructions, references, sometimes helper scripts. | A model's artistic competence, executable access, or a working installation. |
| MCP server / editor bridge | Callable operations on a running tool or application. | A production pipeline, visual quality, or compatibility with our exact version. |
| Script, CLI, or application API | Repeatable inspection, transformation, export, and verification. | That generated inputs are correct or appropriate for the game. |
| Asset generator | Candidate images, meshes, motion, or audio. | Finished game assets with correct pivots, UVs, rigging, cost, consistency, or rights metadata. |

A strong workflow combines these deliberately. For example, a skill can direct Blender to normalize a supplied model, a script can report its dimensions, and PlayCanvas can show whether its scale, lighting, and animation actually work in our scene.

## Source credibility and freshness

“Official” below means published by the relevant product organization, not merely described as official by a community project. Repository popularity is recorded only where it helps assess visibility. It is not a shipped-game credential or independent validation.

| Source | Provenance and inspected freshness | Evidence and limits |
| --- | --- | --- |
| [playcanvas/skills](https://api.github.com/repos/playcanvas/skills) | PlayCanvas; created 4 Aug 2026, pushed 13 Oct; MIT. Inspected tree `38d8fa7`. | First-party, precise engine conventions and scripts; 16 current skills. No OpenLegend execution performed. |
| [gamedev-skills catalog](https://api.github.com/repos/gamedev-skills/awesome-gamedev-agent-skills) | Abhishek Barali's community collection; created 24 Jun, pushed 9 Oct; Apache-2.0. Tree `0a70cfc`. | 74 skills, about 1,575 stars at inspection. Broad useful guidance; no verified shipped-game record established for the maintainer. |
| [EL4CTEO/blender-skills](https://api.github.com/repos/EL4CTEO/blender-skills) | Community, created 14 Oct and pushed 16 Oct; MIT; 59 stars. Tree `71d031d`. | Concrete scripts and 22 skills, but only days old. Author claims are not our qualification results. |
| [dcc-mcp Blender](https://api.github.com/repos/dcc-mcp/dcc-mcp-blender) | Independent DCC-MCP community; created 12 Apr, pushed 17 Oct; 47 stars. | Detailed typed operations and editable examples. Source/PyPI MIT; Blender Extensions distribution GPL-3.0-or-later, per its [README](https://github.com/dcc-mcp/dcc-mcp-blender). |
| [Ahuja Blender MCP](https://api.github.com/repos/ahujasid/mcp-for-blender) | Siddharth Ahuja/community; created Mar 2025, pushed 6 Oct 2026; MIT; about 31,371 stars. | Broad visibility and scene-feedback tools. Not Blender Foundation's MCP. |
| [SPA Aseprite automation](https://api.github.com/repos/aigengame/aseprite-automation) | aigengame community; created 10 Sep, pushed 17 Oct; MIT; 21 stars. | Editable assets, actual examples, structured failure handling. Separate Aseprite license and executable required. |
| [Coherent Gameface MCP](https://api.github.com/repos/CoherentLabs/Gameface-MCP) | First-party Coherent Labs; created 25 Jun, pushed 15 Oct; MIT; 3 stars. | Useful vendor-authored UI process despite low stars. Specific to Gameface's renderer and Player. |
| [Microsoft Playwright CLI](https://api.github.com/repos/microsoft/playwright-cli) | First-party Microsoft; pushed 14 Oct; Apache-2.0. | Actual browser tools and skill; its routine preference for accessibility snapshots must be supplemented with images for game art. |

Metadata dates mean repository activity, not the last successful test of every instruction. The [catalog's version table](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/0a70cfc64672d512c5b5b6006b5dcb5cf90dbdbd/docs/VERSION-SUPPORT.md) and current README even differ on a Bevy baseline. PlayCanvas's website skill list also lags its repository. Use the actual selected files and installed application version as the review basis.

## Twenty-five candidate workflows

These are candidate workflows rather than 25 installations. Several combine neighboring skills that solve one production task.

### 1. Find the right PlayCanvas surface and reuse its existing capabilities

**Kind:** first-party skills. **Proposal:** use now as task-specific references.

The actual [build-app](https://github.com/playcanvas/skills/blob/main/skills/build-app/SKILL.md) and [apply-conventions](https://github.com/playcanvas/skills/blob/main/skills/apply-conventions/SKILL.md) skills start from the code's existing surface and lifecycle. [find-examples](https://github.com/playcanvas/skills/blob/main/skills/find-examples/SKILL.md) uses examples from the installed engine's exact version, and [reuse-scripts](https://github.com/playcanvas/skills/blob/main/skills/reuse-scripts/SKILL.md) points to shipped camera, water, sky, picker, outline, and statistics utilities.

For OpenLegend, use these before creating another camera, sky, or picking subsystem. Preserve our accepted input mappings and renderer interface. Generic sample physics and application-owned game-state patterns do not override our server authority. The important saving is locating a supported implementation and adapting its public contract, not copying a tutorial scene wholesale.

### 2. Inspect and calibrate GLB assets before placing them

**Kind:** skills plus offline inspection script. **Proposal:** high-priority pilot.

[inspect-glb](https://github.com/playcanvas/skills/blob/main/skills/inspect-glb/SKILL.md) includes `scripts/inspect.mjs` for geometry, bounds, joints, clips, morphs, and inspection limits. [calibrate-model](https://github.com/playcanvas/skills/blob/main/skills/calibrate-model/SKILL.md) distinguishes an asset's measured support points, visual pivot, scale, and facing from an arbitrary bounding box.

Apply this to one existing mercenary or new prop. Record one calibration, inspect it beside a known-size object, and reuse the result. Do not change bones to compensate for a root placement problem. Compressed-model inspection may need a pinned decoder; its current helper does not support every compression path. A bounds report cannot determine semantic front-facing direction by itself.

### 3. Prove animation binds to the intended skeleton

**Kind:** PlayCanvas skill. **Proposal:** high-priority for current/future skinned assets.

[configure-animation](https://github.com/playcanvas/skills/blob/main/skills/configure-animation/SKILL.md) checks real clip and target paths, animation ownership, blend ranges, and sampled non-root joint motion. An advancing playback timer is not proof that a character is moving.

This maps directly to mercenary presentation and the staged character pipeline. Use an explicit expected clip list, inspect idle/walk/attack transitions, then review feet, silhouette, and weapon alignment in the actual camera. The server decides that an action happened; animation shows it. The skill does not justify adding a second client combat simulation.

### 4. Tune lighting as a coherent scene, with selective baking

**Kind:** PlayCanvas lighting/baking skills. **Proposal:** use lighting method now; bake selectively.

[light-scene](https://github.com/playcanvas/skills/blob/main/skills/light-scene/SKILL.md) works through illumination, exposure, environment, shadows, and postprocessing with screenshot feedback. [bake-lighting](https://github.com/playcanvas/skills/blob/main/skills/bake-lighting/SKILL.md) requires appropriate static objects and UVs.

OpenLegend needs daytime and nighttime readability across sprites and meshes, driven by its actual public world clock. Establish a small day/night reference set and tune one class of parameter at a time. Blanket baked sunlight is a poor default for movable objects, construction, and a changing sun. Offline asset previews should reveal material defects; they must not substitute a flattering studio render for in-game acceptance.

### 5. Build effects within the existing material/rendering path

**Kind:** PlayCanvas skills. **Proposal:** use for specific visible outcomes.

[add-effects](https://github.com/playcanvas/skills/blob/main/skills/add-effects/SKILL.md) distinguishes particles, shader modifications, meshes, and screen effects. [override-shader-chunks](https://github.com/playcanvas/skills/blob/main/skills/override-shader-chunks/SKILL.md) preserves existing lighting, shadows, skinning, and fog instead of rebuilding an entire material.

That suits restrained water, dust, fire, highlight, and invention feedback. Reuse emitters where appropriate, and measure first-use compilation hitches. Chunk names and GLSL/WGSL interfaces are version-sensitive: current examples must be checked against OpenLegend's pinned 2.22.2. An effect should represent an observable world outcome, not expose hidden state.

### 6. Optimize loading and draw calls after identifying the bottleneck

**Kind:** PlayCanvas asset/performance skills. **Proposal:** use when measurement identifies a problem.

[load-assets](https://github.com/playcanvas/skills/blob/main/skills/load-assets/SKILL.md) covers container loading and decoder/texture-compression setup. [reduce-draw-calls](https://github.com/playcanvas/skills/blob/main/skills/reduce-draw-calls/SKILL.md) distinguishes fill cost from submission cost and considers hidden rendering, batching, instancing, and spatial organization.

OpenLegend's repeated props and sprite/mesh populations make this relevant. Reduce texture memory or unnecessary draws when the measured scene needs it. Avoid importing universal polygon budgets or merging the entire world into one batch that frustrates visibility and updates. Decoder availability and download overhead belong in the observed result.

### 7. Inspect a live scene and compare repeatable captures

**Kind:** PlayCanvas skills plus browser tooling. **Proposal:** visual method now; runtime inspector gated by version.

[verify-pixels](https://github.com/playcanvas/skills/blob/main/skills/verify-pixels/SKILL.md) requires a controlled camera, state, time, and randomness; first check that the baseline can repeat. It reserves byte-identical expectations for changes that should preserve pixels exactly.

[inspect-runtime](https://github.com/playcanvas/skills/blob/main/skills/inspect-runtime/SKILL.md) uses a development inspector hook and requires Engine 2.23+. Our [client manifest](../../../apps/client/package.json) pins 2.22.2, so this is **not immediately compatible**. Do not add a production hook or upgrade merely to follow the skill. Full-screen UI review must capture React DOM alongside the canvas.

### 8. PlayCanvas Editor MCP, if we choose an Editor authoring workflow

**Kind:** first-party editor bridge. **Proposal:** defer unless a concrete Editor task justifies it.

The [official server](https://developer.playcanvas.com/user-manual/editor/mcp-server/) requires Node 22.18+ and an open, connected PlayCanvas Editor project. It operates on that project and can inspect/edit assets and scenes, capture the viewport, launch the application, inject input, and inspect runtime logs.

OpenLegend currently uses standalone Engine source. This bridge does not automatically control that source-owned scene. Any pilot must decide where edited assets/scenes live and how their output enters the repository. Its Editor mutations are direct; a local Git branch alone is not a checkpoint of the connected Editor project.

### 9. The catalog's asset-family workflow

**Kind:** community skill, templates, Python helpers. **Proposal:** adopt the method; adapt helpers to our manifests.

[create-game-assets](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/create-game-assets/SKILL.md) is the supplied catalog's strongest direct fit. It includes `asset_report.py`, `build_preview_sheet.py`, an art-direction template, and asset-manifest examples. Its [art-direction reference](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/create-game-assets/references/art-direction.md) makes shape, value, palette, material, edge, and motion choices explicit.

For OpenLegend, approve one representative item family before expanding it. Keep camera, scale, silhouettes, and material treatment stable. Its [raster guidance](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/create-game-assets/references/raster-pipeline.md) supports deterministic alpha/crop/anchor normalization, native-size checks, nine-slice frames, and repeat testing for tiles. This directly addresses attractive isolated images that fail together in an inventory or landscape. Helpers require Python 3.10+ and Pillow; they are not an image generator.

### 10. Catalog UI, procedural generation, and shader references

**Kind:** conceptual skills. **Proposal:** consult selectively, not as new project policy.

[game-ui-ux](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/game-ui-ux/SKILL.md) covers HUD updates, focus, screen flow, and input. [procedural-gen](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/procedural-gen/SKILL.md) supports reproducible recipes and generating inspectable data. [shader-programming](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/shader-programming/SKILL.md) is useful conceptual GLSL/HLSL grounding.

Adapt the relevant ideas to our existing UI and deterministic domain. Do not adopt blanket layout prohibitions, unexplained performance rules, or a new random-state authority. World-positioned labels can legitimately use absolute positioning, and PlayCanvas shader integration needs its own versioned documentation.

### 11. Adobe React Aria's official agent skill

**Kind:** documentation skill, plus optional MCP. **Proposal:** high-priority reference for existing controls.

Adobe [publishes an agent skill and Markdown documentation](https://react-aria.adobe.com/ai). We inspected its [actual generator](https://github.com/adobe/react-spectrum/blob/261344335e54265b2d02dc57a43b911a718de707/packages/dev/s2-docs/scripts/generateAgentSkills.mjs): the React Aria skill is Apache-2.0, bundles component and interaction references, and targets projects using `react-aria-components`. It is distinct from Adobe's Spectrum S2 styling, audit, and migration skills.

Use it to preserve selection, focus, menus, overlays, and keyboard behavior while giving controls OpenLegend's artwork. Its [test guidance](https://github.com/adobe/react-spectrum/blob/261344335e54265b2d02dc57a43b911a718de707/packages/dev/s2-docs/skills/react-aria/test-utils-guidance.md) explains pattern testers and explicit exceptions for focus order, dismissal, and drag behavior. Those are targeted tools for actual interaction risks, not a requirement to add tests to every cosmetic change. The generated website package was not downloaded; the generator and embedded guidance were inspected.

### 12. Anthropic's frontend-design skill

**Kind:** first-party design instructions; [Apache-2.0 for this skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/LICENSE.txt). **Proposal:** adapt as critique guidance.

The actual [skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) asks for subject-specific visual direction, intentional typography, a compact token system, design review before implementation, screenshots, and restraint.

This is evidence that a useful design process is packaged with an agent, not proof that Claude is inherently better at all game UI. Its web-page examples and novelty-seeking defaults require adaptation: OpenLegend already has a brief, established fonts, and a world-first layout. Do not add a marketing hero, replace its visual identity, or prioritize novelty over recognizable item interaction.

### 13. Coherent Labs' Game UI Conductor

**Kind:** MIT skill, reference corpus, and Gameface MCP. **Proposal:** adapt the specification and verification methods.

The inspected [skill](https://github.com/CoherentLabs/Gameface-MCP/blob/d59d949d5a491947bacd9240581d0645bf50bb6b/.claude/skills/gameface-conductor/SKILL.md) and [dimensions reference](https://github.com/CoherentLabs/Gameface-MCP/blob/d59d949d5a491947bacd9240581d0645bf50bb6b/.claude/skills/gameface-conductor/references/dimensions.md) cover interaction modes, feedback, ownership of data, empty/error/loading states, scale, accessibility, localization, and lifecycle. Its live checks include text fit, overlap, containment, and performance scoped to the active view.

Apply those questions to an inventory spec using our current docs and reasonable defaults. Do not transplant its repeated mandatory sign-off ceremony into already-authorized tasks. Do not copy Gameface's unsupported-CSS rules into the browser. The official [workflow account](https://guide.coherent-labs.com/building-with-ai/overview/) expressly acknowledges that runtime checks cannot supply missing art direction and that isolated-screen success can break the surrounding interface.

### 14. Microsoft Playwright CLI skill or MCP

**Kind:** browser CLI/skill or MCP. **Proposal:** use the project's supported browser route for a short visual loop.

The actual [CLI skill](https://github.com/microsoft/playwright-cli/blob/main/skills/playwright-cli/SKILL.md) provides snapshots, interactions, screenshots, console/network inspection, tracing, motion/media settings, and annotated review. Microsoft's [MCP README](https://github.com/microsoft/playwright-mcp) recommends CLI+skills for some code-agent workflows to reduce context overhead; persistent MCP sessions remain useful for richer exploration.

For OpenLegend, perform real inventory and world interactions, then inspect the full rendered image. Accessibility trees cannot reveal muddy lighting, bad silhouettes, inconsistent icons, or a panel obscuring the scene. Use only authorized development sessions; the skill's storage-state and cookie utilities are capabilities, not a reason to inspect unrelated accounts. Existing browser tooling may already cover the task, so no duplicate installation is presumed.

### 15. Blender Foundation's Blender Lab MCP

**Kind:** first-party experimental authoring integration. **Proposal:** evaluate as one possible Blender bridge.

The [official Blender Lab page](https://www.blender.org/lab/mcp-server/) describes a Python-API connection requiring Blender 5.1+, an add-on, a separate MCP server, and an LLM client. It explicitly says model-written Python executes without a data-protection sandbox. [Blender Lab's catalog](https://www.blender.org/lab/) identifies the project.

This is distinct from Ahuja's popular community repository. A disposable asset workspace and explicit export destinations are appropriate for a future trial because the actual operation is arbitrary Python inside Blender. Source hosting was inaccessible in this research environment; only official documentation was verified, so no package-level license or implementation-security claim is made. Start by inspecting an existing scene, not by granting a generator unrestricted work over important source files.

### 16. Ahuja's community Blender MCP

**Kind:** MCP plus Python execution and asset-service integrations. **Proposal:** candidate alternative, not an additional mandatory bridge.

The canonical [repository](https://github.com/ahujasid/mcp-for-blender) now exposes compact scene tools including `look`, scene inspection, asset import, and Python execution. Its visual feedback can inspect viewpoints, multiple animation frames, and wireframe or material appearance.

The current README distinguishes content telemetry requiring opt-in from anonymous usage metadata enabled by default; `DISABLE_TELEMETRY=true` disables collection. It also describes automatically preferring an enabled premium generator. Therefore a local Blender trial should configure the actual telemetry and asset-provider behavior deliberately; an editor tool's default is not authorization for paid generation. Popularity does not prove its imported models are game-ready or that every asset source shares the same license.

### 17. DCC-MCP Blender Geometry Nodes

**Kind:** MIT source skills plus typed Blender adapter. **Proposal:** promising procedural-authoring pilot.

The actual [Geometry Nodes skill](https://github.com/dcc-mcp/dcc-mcp-blender/blob/main/src/dcc_mcp_blender/skills/blender-geometry-nodes/SKILL.md) uses observed node-tree references and interface revisions, distinguishes pass-through and empty templates, and warns that changing a shared group changes all users. It inspects state after partial mutation rather than blindly retrying.

Use it to build a small reusable foliage, rock, or construction-detail recipe with exposed seed and density controls. Keep the editable graph and preview variations at the actual game camera. A graph that exists is not proof of acceptable evaluated geometry, triangle count, or exported output. The adapter and DCC-MCP runtime must be installed separately; its own claimed “official” status is within DCC-MCP, not Blender Foundation.

### 18. DCC-MCP Blender materials, shader nodes, and lighting

**Kind:** typed skills and editor tools. **Proposal:** use if this bridge is selected.

The inspected [shader-node skill](https://github.com/dcc-mcp/dcc-mcp-blender/blob/main/src/dcc_mcp_blender/skills/blender-shader-nodes/SKILL.md) favors explicit nodes, sockets, links, and material helpers. The [lighting skill](https://github.com/dcc-mcp/dcc-mcp-blender/blob/main/src/dcc_mcp_blender/skills/blender-lighting/SKILL.md) handles lights, environment, linking, and actual node paths; an unconnected IES texture is not a functioning light.

This is useful for repeatable authoring previews and material consistency. Preserve a neutral inspection rig as well as an intended game-lighting preview. Cycles-only features, offline displacement, or compositor effects are not automatically available in exported glTF or PlayCanvas. The [adapter README](https://github.com/dcc-mcp/dcc-mcp-blender) lists Blender 4.5 LTS and 5.2 CI targets, not a guarantee for our uninspected local Blender installation.

### 19. EL4CTEO's procedural Blender scripts

**Kind:** community skills plus Blender Python. **Proposal:** narrow trial; new source.

[blender-geometry-nodes](https://github.com/EL4CTEO/blender-skills/blob/main/skills/blender-geometry-nodes/SKILL.md) includes `gn_builder.py`, declarative graph construction, live socket discovery, meaningful parameters, and evaluated geometry checks. It can run through a bridge or Blender's own scripting path.

This is a concrete way to reproduce the supplied video's “build a recipe” principle. A generated recipe for a family of shrubs or worn posts is more maintainable than unrelated meshes. The collection targets Blender 5.2 and was created only days before inspection; validate one graph and exported asset before relying on its wider scripts. Delay realizing instances until the authoring/export operation actually needs it.

### 20. EL4CTEO asset QA and optimization

**Kind:** skills plus `qa_check.py`, `review_shots.py`, and `mesh_stats.py`. **Proposal:** adapt the reports.

[asset-qa](https://github.com/EL4CTEO/blender-skills/blob/main/skills/blender-asset-qa/SKILL.md) creates multi-angle and wireframe evidence; [game-optimization](https://github.com/EL4CTEO/blender-skills/blob/main/skills/blender-game-optimization/SKILL.md) examines geometry, material count, texture footprint, and level-of-detail choices.

For OpenLegend, report floating pieces, normals, UV defects, silhouette loss, and costs that affect the actual camera. Do not copy universal platform budgets or automatically repair every non-watertight object: leaf cards, deliberate overlaps, and socket offsets may be correct. Work on output copies, keep the editable source, and compare the result in PlayCanvas. More LODs are not automatically more efficient.

### 21. EL4CTEO rigging and deformation checks

**Kind:** skill plus Rigify/skinning scripts. **Proposal:** restricted character trial.

The actual [character-rigging skill](https://github.com/EL4CTEO/blender-skills/blob/main/skills/blender-character-rigging/SKILL.md) separates control and deform skeletons, provides heat-weight/proxy fallback, generates a game skeleton, and asks for stress-pose inspection. It also says its automatic metarig fit only scales; joint placement still needs correction.

That is a valuable antidote to accepting an “auto-rigged” label. Use a single suitable humanoid and inspect shoulders, elbows, hips, feet, and exported clips. Its Unity/Unreal/Roblox profiles are not PlayCanvas validation profiles, and its coordinate conventions should not replace our measured export contract. It does not establish arbitrary quadruped, creature, or generated-topology rigging success.

### 22. SPA Aseprite automation

**Kind:** CLI, agent skill, optional MCP; MIT code. **Proposal:** high-value trial for icons/sprite families if Aseprite is available.

The [actual SPA skill](https://github.com/aigengame/aseprite-automation/blob/main/skills/spa/SKILL.md) uses installed command schemas, explicit source/output paths, native editable files, checked batch plans, frame validation, and export inspection. It distinguishes “the validation command succeeded” from “the asset is valid,” and handles partial publication explicitly.

The [project](https://github.com/aigengame/aseprite-automation) requires Python 3.13+, uv, and a separate Aseprite installation; its examples retain editable sources and exported components. For OpenLegend, use it to normalize a coherent icon family, repair alpha/anchors, assemble deliberate motion, and export sheets. Independent generation of every animation frame remains liable to identity and pose drift; SPA supplies editing and export, not automatic artistic continuity.

### 23. DCC-MCP Substance 3D Designer graph and offline workflows

**Kind:** community MIT adapter and skills using Adobe software. **Proposal:** especially relevant if Designer is already available.

The actual [designer-session skill](https://github.com/dcc-mcp/dcc-mcp-substance3d-designer/blob/6c0566c9149271ffa72f1703801f8a2c0c5bdb96/src/dcc_mcp_substance3d_designer/skills/designer-session/SKILL.md) operates on explicit graph/node IDs, parameters, links, outputs, packages, and native exports. It requires state inspection and distinguishes an exported hash from visual accuracy. [designer-offline](https://github.com/dcc-mcp/dcc-mcp-substance3d-designer/blob/6c0566c9149271ffa72f1703801f8a2c0c5bdb96/src/dcc_mcp_substance3d_designer/skills/designer-offline/SKILL.md) uses installed official cooking/rendering tools with declared resolution, channel, bit depth, and color space.

The [editable crate study](https://github.com/dcc-mcp/dcc-mcp-substance3d-designer/blob/6c0566c9149271ffa72f1703801f8a2c0c5bdb96/docs/showcase/crate-lookdev/README.md) supplies SBS/SBSAR graphs, maps, UV evidence, and a Blender scene. It explicitly calls itself dense look development, not game-ready retopology. Transfer the layered wood/rust recipe, not its mesh complexity. This is stronger evidence than a marketing screenshot, but not a shipped-game result. The adapter is young and needs Designer plus matching SDK/runtime; its MIT license does not supply Adobe software.

### 24. Material Maker and its experimental bridges

**Kind:** procedural material application plus community bridges. **Proposal:** evaluate the authoring method; do not rely on the original bridge.

Material Maker is a Godot-built node-based texture authoring application. Its output can be exported for other engines: using it does not imply migrating OpenLegend to Godot. [Upstream project and documentation](https://github.com/RodZill4/material-maker).

The promising name `schemann/material-maker-mcp` hides an important gap: its inspected [bridge README](https://github.com/schemann/material-maker-mcp/blob/3a0a4bbd2662fd647f08767fe36d03024fd0d0c0/addons/mcp_bridge/README.md) lists graph mutation, rendering, and export actions as skeletons returning “not implemented yet.” It is **not a complete automation recommendation**.

The newer [Tigertycoon descendant](https://github.com/Tigertycoon/material-maker-mcp) adds typed tools, preview images, graph validation, parameter sweeps, and manifests. It requires Python 3.11+, uv, Godot 4.7, graphics, and an extended application checkout; a standard Material Maker binary is insufficient. Live Windows results and host-only Linux CI are author-reported. A timeout does not cancel mutation. Trial one disposable material before considering it part of production.

### 25. Godot and Unity editor automation as comparison references

**Kind:** community engine-specific MCP integrations. **Proposal:** relevant to an engine experiment, not our immediate tool stack.

[Coding-Solo/godot-mcp](https://github.com/Coding-Solo/godot-mcp) uses Node 18+, installed Godot, CLI commands, and bundled GDScript for launch/debug/scene operations. Its listed tools do not establish a complete visual art-review loop. The newer [hi-godot/godot-ai](https://github.com/hi-godot/godot-ai) supplies live-editor tools for UI, materials, animation, and other operations; current v4 requires Godot 4.7+, and C# support is text-only rather than a .NET build/verification service.

[CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp) is community/Aura-sponsored, not Unity official. Its documented Unity 2021.3 LTS–6.x, Python, and uv workflow includes scene, asset, animation, profiling, and test operations. Recent activity and many stars make these worth examining; they do not show they outperform a PlayCanvas workflow on this project. Use them only within the [engine comparison conditions](05-playcanvas-godot-and-engine-choice.md).

## Candidates deliberately not adopted

| Candidate or temptation | Reason |
| --- | --- |
| Installing the entire supplied catalog/router | Its default favors the engine it covers most deeply. OpenLegend already has an engine, project routing, and stronger domain constraints. Select useful discipline files instead. [Router](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/router/SKILL.md). |
| [chongdashu/unreal-mcp](https://github.com/chongdashu/unreal-mcp) as a production recommendation | Its README labels it experimental and unsuitable for production; metadata last push was April 2025. It requires an Unreal native editor plugin plus Python. A MIT badge was visible, but a matching license file was not established. |
| Combining several Blender bridges immediately | Overlapping scene mutation and execution surfaces make the workflow harder to understand. Select one based on the single task's required operations and feedback. |
| Copying generic physics, save-state, or agent-behavior patterns | They can conflict with OpenLegend's server authority, persisted world, deterministic rules, and permitted observer view. The local [boundaries](../../../docs/engine-and-world-boundaries.md) remain authoritative. |
| Treating videos or text-to-video as rigged animation | A video is not a reusable skeleton, weight map, animation clip, or engine-tested motion set. Require the actual output contract. |
| Treating a first-party source as universally compatible | PlayCanvas 2.23 inspector versus our 2.22.2 dependency, Blender-version differences, and Adobe Spectrum versus React Aria demonstrate why exact context matters. |

Audio and model-specific asset generators belong with the separate model/production research. Two additional sources discovered are [ElevenLabs' official text-to-speech skill](https://github.com/elevenlabs/skills/tree/main/text-to-speech) and [NVIDIA Kimodo](https://github.com/nv-tlabs/kimodo) for skeletal motion. They are cross-references, not implementation-qualified candidates in this tooling review.

## Proposed adoption order and evidence

Start with methods that can improve the next deliverable without creating a new platform:

1. **One inventory family:** use current OpenLegend art direction, the catalog's asset-family process, React Aria references, and complete-screen browser review. Retain icons, border assets, component states, and the accepted screenshot together.
2. **One 3D asset round trip:** inspect/calibrate the model, fix only observed Blender problems, verify clips, load in the current PlayCanvas scene, and record source/export conventions. Use one Blender execution path.
3. **One lighting comparison:** establish reproducible noon, dusk, and night views with the public clock; review sprites, models, UI legibility, and contact shadows together.
4. **One procedural material or foliage recipe:** retain graph, inputs, seed, exports, and preview. Choose Designer if available and suitable, or Material Maker/Blender based on actual setup cost. Prove that another variant is cheaper to produce and remains coherent.
5. **Only then automate the repeated steps:** turn the successful calibration, export, family-preview, and browser-review operations into narrow project instructions. Keep the existing repository's skill routing and avoid competing general routers.

For each pilot, record hands-on setup, agent correction rounds, broken exports, visual defects found, reuse effort, and the final in-game result. Compare with the prior way of producing the same asset family. Tool counts, generated lines, and uninterrupted agent hours do not answer whether we improved production.

The research supports these candidates because their actual instructions address observable OpenLegend problems. It does not claim that any unrun integration is installed, tested, safe by inspection alone, or better than every alternative. A small, successful end-to-end pilot supplies the missing evidence needed to adopt it with confidence.

