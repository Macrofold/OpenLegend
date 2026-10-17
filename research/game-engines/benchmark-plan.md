# Proposed engine comparison and performance qualification

| Research status | Progress | Last updated |
| --- | --- | --- |
| Conditional comparison design; not executed | Defines representative runtime and AI-assisted production evidence without making a native trial precede the browser milestone. | 2026-10-17 |

## 1. Purpose and status

This is a proposed evaluation protocol, not an implemented benchmark suite, approved hardware specification or claim of measured performance. No engine builds, live AI calls, controller-device tests or console SDK checks were run for this desk-research task.

The [first-player milestone](../../docs/maintainers/first-player-milestone.md) is the selected next delivery. Measure the integrated browser experience first. Invoke the cross-engine protocol when a required capability, actual client bottleneck or credible production-workflow advantage gives the comparison a concrete purpose. Do not launch a port merely because this plan exists or an engine is trending.

The goal is to determine whether an engine/platform/tooling change improves the required Open Legend experience enough to justify its total future cost—not to maximize cube counts, win a vendor comparison or rationalize a preference.

## 2. Start with a small shortlist

Use PlayCanvas as the browser baseline and a Godot native candidate when the selected question warrants a policy-compatible native trial. Include Unity native/URP when licensing and implementation authorization permit and it addresses the question. Add Babylon for a concrete browser-tooling/rendering issue; add Unreal for a required high-end feature or direct-action workflow.

This sequencing does not presume the incumbent wins. It avoids building six incomplete ports whose differences mostly reflect implementation quality. A candidate that fails a required capability should be eliminated before extensive optimization. Godot's growing AI ecosystem can justify a specific productivity hypothesis, not an automatic native assignment.

## 3. Two fair comparisons, not one misleading test

**Matched common-feature comparison:** use the same permitted world observations, assets, camera path, resolution, meaningful lights/shadows, animation workload, interface content and update schedule. This helps isolate implementation costs. Record every unavoidable difference.

**Best practical implementation comparison:** let each engine use its appropriate production techniques to deliver the same required player experience. This captures the value of integrated facilities rather than handicapping them to the weakest common denominator. Record engineering time, visual differences and maintenance burden alongside performance.

Both matter. A strictly identical implementation can suppress an engine's strengths; wholly different scenes conceal incomparable workloads. Never equate upscaled output with native-resolution rendering without recording internal resolution and reconstruction.

## 4. Representative journeys

### A. A dense inhabited place

Walk through an area containing moving people, animals, held equipment, shadows, local lights, transparent scenery and captions. Open inventory and inspect a person while others continue moving. Include repeated assets and unique appearances. Test a concentrated gathering and the same population dispersed across the map.

This identifies animation, visible-object management, overdraw, server interaction density and interface contention. A static crowd is a separate subtest, not a replacement for the moving case.

### B. Exploration and loading

Move from a sparse region into a dense settlement, rotate the camera quickly, change elevation and revisit an area after assets have been released. Measure cold entry, warm entry, transition hitches and memory after repeated cycles.

This tests streaming, asset reuse, disposal and scene preparation. Do not preload everything and then claim seamless first-time loading.

### C. Building and live change

Preview and place a supported structure, change geometry while another character travels nearby, inspect the result and remove it through normal rules. Confirm rendering, selection, collision and perceived information remain consistent.

This invalidates static-scene shortcuts and exposes expensive rebuilds. The same authority should decide outcomes for every candidate client unless a separate server architecture is explicitly evaluated.

### D. Invention and new content

Admit a supported invention, obtain a newly produced visual asset after packaging, inspect/craft/use it, then reconnect. Include failed download, unsupported material/animation, cancellation and a world switch before loading completes.

Use deterministic, non-paid fixtures for comparison unless live-provider work is separately authorized. Fixture success qualifies the client workflow, not live model quality or useful invention by an actual model.

### E. Complete controller and text journey

With the mouse disconnected, enter a world, move, fight or evade, select overlapping targets, manage inventory, build, converse, propose an invention, review it, change settings, disconnect/reconnect the controller and quit. Exercise keyboard input methods, captions and large UI scaling as separate accessibility checks.

A moving character controlled by one stick is not sufficient evidence. Qualify the controls selected for the actual candidate, without treating a hypothetical device journey as already implemented or newly mandated for the browser milestone.

## 5. Workload specification

Record stored entities, active actors, interaction density, visible animated actors, bones/animation complexity, unique materials/textures, shadow casters, lights, transparent screen coverage, interface rows/captions, update frequency, connected players and history size separately.

Increase the selected dimensions until the intended target or explicit safe stopping limit is reached. An exploratory ladder could use tens, hundreds and then thousands of entities where safe and relevant; these are categories for finding limits, not promised capacities. Large inert populations and smaller highly interactive populations are separate experiments.

Preserve meaningful outcomes and disclosure. A faster candidate that omits speech, stops simulating meaningful people, disables required cues or ignores construction collisions is not a performance-equivalent result.

## 6. Hardware and environment

Candidate device classes are an integrated-graphics laptop, a midrange discrete-GPU desktop, an Apple-silicon machine if targeted, a handheld PC and a lower mobile tier if mobile is intended. Exact models and minimum supported class remain owner decisions; do not assume the developer's computer represents every player.

Record CPU/GPU, RAM/VRAM, driver, OS, browser, graphics backend, display/internal resolution, refresh rate, power mode, thermal state, build flags and background load. Cover relevant browser families and the chosen fallback rather than one best-case configuration.

Use packaged/production clients, not an editor versus a minified web release. Test cold and warmed runs and longer sessions. Keep developer-tool/capture overhead consistent or report its impact. Pin the engine, add-ons and export tools; prerelease experiments must be labeled separately.

## 7. Separate server, transport and client measurements

First replay a fixed permitted-view stream into each renderer to study client work without variable AI/database delays. Then run the end-to-end journey against the same authoritative server. A replay does not qualify gameplay correctness, and an end-to-end slowdown does not automatically identify rendering as the cause.

For the server, measure simulation progress, command queue delay, calculation time, durable writes, view preparation, memory, history retrieval and AI scheduling separately. For transport, measure bytes, message rate, queue age, loss/reconnect behavior and update staleness. For the client, measure decode/application work, animation, render preparation, GPU time, presentation latency and memory.

Use controlled delay/loss profiles appropriate to the question. Local, regional and degraded connection profiles must have recorded values rather than being claimed representative of every player's internet.

## 8. Metrics and proposed budgets

A possible desktop target is sustained 60 FPS at an agreed visual tier; a handheld/mobile tier may choose 30 or 60 deliberately. These are proposed targets, not existing accepted limits. Record frame-time p50/p95/p99, worst hitches, actual resolution/quality and headroom. Include measurement windows and sample counts.

Also record click-to-local-feedback, input-to-visible-motion, input-to-confirmed-action, first-load/reconnect time, shader/asset first-use stalls, process/GPU memory, memory after repeated world changes, sustained power/thermal behavior and server cost per useful simulated activity.

A slightly lower median should not conceal worse first-use stalls, memory growth or long-session tails. Do not report improvement percentages without matched baselines and repeated runs. A timeout or missing GPU timer is a limitation, not a pass.

## 9. AI-assisted production comparison

The [Godot community/AI review](godot-community-and-ai-2026.md) identifies a testable production opportunity. Evaluate **time and cost to an accepted, inspected and maintainable change**, not time to the first generated scene. This section does not install an MCP integration, change agent permissions or authorize paid tools.

Choose representative tasks before the engine/tool: an overlapping-target selection repair, a menu/focus change, a live-loaded asset or cancellation/reconnect. Use equivalent requirements, input assets and correctness expectations. Compare an adequately automated browser workflow with the actual supported Godot integration; include other engines only when relevant. Distinguish editor/scene operations, compiler feedback, live game-state inspection, screenshots/video, input simulation and exported-game testing rather than counting them as one capability.

Hold the model version, prompt/task information, permitted tools, budget and environment comparable where feasible. Record unavoidable differences. Separate first setup from warm repeat work, and record wall time, provider/tool cost, failed attempts, human interventions, review fixes, unintended changes and verification time. Add a follow-up requirement or repair to test whether the generated structure remains understandable. One favorable demo is not a stable productivity rate.

The output must pass its actual behavioral and visual checks and meet the required runtime budget. Headless success does not prove graphics; a screenshot does not prove interaction; an attractive victory screen does not prove the intended route was executed. Use independent required outcomes rather than letting the generating agent redefine its acceptance. Existing verification guidance determines suitable checks; this proposal is not permission to build a broad new automated suite by default.

Pin the tool/release and inspect permissions, network exposure, telemetry and recovery. Preserve unrelated work and do not copy blanket auto-approval examples. The developer editor bridge must never become an unrestricted player/NPC runtime tool. A productivity benefit that depends on bypassing those boundaries does not qualify.

## 10. Decision gates

**Capability gate:** required controls, effects, runtime content and deployment paths exist in a legally usable configuration.

**Correctness gate:** the complete journey preserves authority, privacy, cancellation, saves and meaningful feedback.

**Performance gate:** required scenes meet the chosen hardware/quality targets with sustainable memory and headroom.

**Production gate:** representative changes are economical to build, verify, revise and maintain, including agent setup and human correction. No fragile private fork or unsupported plugin is silently assumed away.

**Product gate:** any loss of browser access, increased download friction or altered creator workflow is outweighed by an actual user benefit. This needs appropriate evidence, not only engineering preference.

## 11. What each outcome means

If the server is the bottleneck across clients, optimize its work independently. If browser performance fails because of correctable scene organization, compare that fix's future cost with native integration. If a required client capability or sustained budget remains uneconomical on the browser, a migration has a concrete case. A repeatable production advantage can also justify a switch, provided runtime and product requirements still hold.

If Godot meets the experience and maintenance targets, its policy-compatible case strengthens. If it needs disproportionate custom work while Unity succeeds, examine Unity's rights option rather than protecting a preference. If Unreal's integrated systems uniquely make the required experience economical, revisit that engine and its legal arrangement explicitly.

A trial can end with staying, switching or an expressly approved requirement change. It should not create several permanently maintained clients or a generic benchmark framework that never answers the selected question. The current browser milestone and broader release requirements remain open until their actual evidence exists.
