# Proposed engine comparison and performance qualification

| Research status | Progress | Last updated |
| --- | --- | --- |
| Completed test design; not executed | Defines fair, representative evidence needed before an engine migration or capacity promise. | 2026-10-15 |

## 1. Purpose and status

This is a proposed evaluation protocol, not an implemented benchmark suite, approved hardware specification or claim of measured performance. No engine builds, live AI calls, controller-device tests or console SDK checks were run for this desk-research task.

The goal is to identify whether an engine/platform change improves the required Open Legend experience enough to justify its total future cost. The goal is not to produce an impressive number of cubes, win a vendor comparison or rationalize a preferred engine.

## 2. Start with a small shortlist

Use the current PlayCanvas client as the browser baseline, a Godot native candidate for the policy-compatible native route, and a Unity native/URP reference when licensing/implementation authorization permits. Add Babylon only for a concrete browser-tooling or rendering question. Add Unreal when a required high-end feature or direct-action workflow could change the decision.

This sequencing does not presume the incumbent wins. It avoids building six incomplete ports whose differences mostly reflect implementation quality. A candidate that clearly fails a required capability should be eliminated before extensive optimization.

## 3. Two fair comparisons, not one misleading test

**Matched common-feature comparison:** use the same permitted world observations, assets, camera path, resolution, meaningful lights/shadows, animation workload, interface content and update schedule. This helps isolate implementation costs. Record every unavoidable difference.

**Best practical implementation comparison:** let each engine use its appropriate production techniques to deliver the same required player experience. This captures the value of native engine facilities rather than handicapping them to the weakest common denominator. Record engineering time, visual differences and maintenance burden alongside performance.

Both are necessary. A strictly identical implementation can unfairly suppress an engine's strengths; a wholly different beautiful scene can conceal incomparable workloads. Never equate upscaled output with native-resolution rendering without recording the internal resolution and reconstruction method.

## 4. Representative journeys

### A. A dense inhabited place

Walk through an area containing moving people, animals, held equipment, shadows, local lights, transparent scenery and captions. Open inventory and inspect a person while others continue moving. Include some repeated assets and some unique appearances. Test a concentrated gathering as well as the same population dispersed across the map.

This identifies animation, visible-object management, overdraw, server interaction density and interface contention. A static crowd is a separate subtest, not a replacement for the moving case.

### B. Exploration and loading

Move from a sparse region into a dense settlement, rotate the camera quickly, change elevation and revisit an area after assets have been released. Measure cold entry, warm entry, transition hitches and memory after repeated cycles.

This tests streaming, asset reuse, disposal and scene preparation. Do not preload everything and then claim seamless first-time world loading.

### C. Building and live change

Preview and place a supported structure, change geometry while another character travels nearby, inspect the result and remove it through normal rules. Confirm rendering, selection, collision and perceived information remain consistent.

This invalidates static-scene shortcuts and exposes expensive rebuilds. The same authority should decide the outcome for every candidate client unless a separate server architecture is explicitly being evaluated.

### D. Invention and new content

Admit a supported invention, obtain a newly produced visual asset after the client has been packaged, inspect/craft/use it, then reconnect. Include failed download, unsupported material/animation, cancellation and a world switch before loading completes.

Use deterministic, non-paid fixtures for comparison unless live-provider work is separately authorized. Fixture success qualifies the client workflow, not live model quality or useful invention by an actual model.

### E. Complete controller and text journey

With the mouse disconnected, enter a world, move, fight or evade, select overlapping targets, manage inventory, build, converse, propose an invention, review it, change settings, disconnect/reconnect the controller and quit. Exercise keyboard input methods, captions and large UI scaling as separate accessibility checks.

A moving character controlled by one stick is not sufficient evidence.

## 5. Workload specification

Record stored entities, active actors, interaction density, visible animated actors, bones/animation complexity, unique materials/textures, shadow casters, lights, transparent screen coverage, interface rows/captions, update frequency, connected players and history size separately.

Use increasing levels until the intended target or an explicit safe stopping limit is reached. A possible exploratory ladder is tens, hundreds and then thousands of visible or active entities where safe and relevant; these are categories for finding limits, not promised game capacities. Large inert populations and small highly interactive populations must be separate experiments.

Preserve the same meaningful outcomes and information disclosure. A faster candidate that omits speech, stops simulating visible people, disables required shadows or ignores building collisions is not a performance-equivalent result.

## 6. Hardware and environment

Proposed device classes are an integrated-graphics laptop, a midrange discrete-GPU desktop, an Apple-silicon machine if it is a target, a handheld PC and a representative lower mobile tier if mobile is intended. The exact models, operating systems and minimum supported class remain owner decisions; do not quietly assume the developer's computer represents every player.

Record CPU/GPU, RAM/VRAM, driver, OS, browser, graphics backend, display/internal resolution, refresh rate, power mode, thermal state, build flags and background load. Browser tests should cover relevant current browser families and the chosen fallback, not just one best-case combination.

Use packaged/production clients rather than comparing an editor against a minified web release. Test both cold and warmed runs and repeated longer sessions. Keep developer tools and capture overhead consistent or report their impact.

## 7. Separate server, transport and client measurements

First replay a fixed permitted-view stream into each renderer to study client work without variable AI or database delays. Then run the real end-to-end journey against the same authoritative server. A replay does not qualify gameplay correctness, and an end-to-end slowdown does not automatically identify rendering as the cause.

For the server, measure simulation progress, command queue delay, calculation time, durable-write latency, view preparation, memory, history retrieval and AI scheduling separately. For transport, measure bytes, message rate, queue age, loss/reconnect behavior and update staleness. For the client, measure decode/application work, animation, render preparation, GPU time, presentation latency and memory.

Use controlled delay/loss profiles for relevant network behavior. An illustrative set could include local, ordinary regional and degraded connections, but exact values must be selected and recorded rather than claimed to represent every player's internet.

## 8. Metrics and proposed budgets

A possible desktop target is sustained 60 FPS at an agreed visual tier; a handheld/mobile tier may choose 30 or 60 deliberately. These are proposed product targets, not existing accepted limits. Record frame-time p50/p95/p99, worst hitches, actual resolution/quality and available headroom. Report measurement windows and sample counts so percentiles are meaningful.

Also record click-to-local-feedback, input-to-visible-motion, input-to-confirmed-action, first-load time, reconnect time, shader/asset first-use stalls, process/GPU memory, memory after repeated world changes, sustained power/thermal behavior and server cost per useful simulated activity.

A candidate should not win because one median is slightly lower while its first-use stalls, memory growth or long-session tails are worse. Do not report a percentage improvement without matched baselines and repeated runs. A timeout or missing GPU timer is a limitation, not a passing result.

## 9. Decision gates

**Capability gate:** required controls, effects, runtime content and deployment paths exist in a legally usable configuration.

**Correctness gate:** the complete journey preserves current authority, privacy, cancellation, saves and meaningful player feedback.

**Performance gate:** required scenes meet the agreed hardware/quality targets with sustainable memory and adequate headroom, not merely an empty-scene average.

**Production gate:** building and maintaining representative content is economical; the team can diagnose failures without a fragile private fork or unmaintained plugin stack.

**Product gate:** any loss of browser access, increase in download friction or change in creator workflow is outweighed by a demonstrated user benefit. This needs user evidence, not only engineering preference.

## 10. What each outcome means

If the server is the bottleneck across all clients, optimize its actual work independently; do not infer that the browser must be replaced. If a browser client fails due to correctable scene organization, compare that fix's future cost with the native route. If required client features or sustained budgets remain unattainable economically on the browser, a native migration has a concrete case.

If Godot meets the required native experience with manageable production work, its policy-compatible case strengthens. If it needs disproportionate custom optimization while Unity meets the target, resolve Unity's licensing option rather than protecting an open-engine preference. If only Unreal's integrated stack delivers an important required experience economically, revisit both the engine and rights choices explicitly.

A trial can end with a decision to stay, switch or narrow the requirement through an explicit owner choice. It should not end with six permanently maintained clients or a generic benchmark framework that never answers the product question.
