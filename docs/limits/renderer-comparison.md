# Renderer comparison limits and constraints

## Scope and status

This inventory owns discretionary constraints for the selected [shared presentation and renderer comparison design](../projects/renderer-comparison-feature-spec.md). The design is under review; these are selected implementation targets, not current runtime capacities or measured optimal values. Existing PlayCanvas behavior is the baseline. [RCP](../maintainers/renderer-comparison.md) owns delivery and evidence.

Shared art, shadow, asset, network and profiling bounds retain their existing inventories. This file records the consumer choices without creating competing copies. Authorization, permitted knowledge and native authority are correctness requirements, not tunable limits.

## RCP-L01 — One active graphics backend and serialized replacement

**Status:** Proposed — selected design, unimplemented. **Restrictiveness:** Safe. **Scope:** one browser game/study instance.

At most one GPU backend draws or receives canvas interaction. At most one replacement/disposal operation is in flight; the selector remains disabled until it settles. The old backend stops drawing/input immediately and rejects late results. A new canvas is used for the successor, whose native activation follows settled predecessor disposal.

The shared controller owns gesture cancellation and canvas replacement inside a stable React/study host. Backend stop owns native scheduling/callbacks; cleanup still settles after UI interest is retired. Suspension retains resources and permits the existing one-shot fresh-view frame; it is not terminal stop or a world-pause operation.

This permits a loading gap and disallows live dual-canvas timing or an unbounded queue of retired parsers/renderers. Failed initialization/cleanup produces an explicit recoverable state rather than silently stacking successors. The purpose is interpretable measurements and simple resource ownership, not a restriction on how many independent people may play. See [RCP08](../maintainers/renderer-comparison.md#rcp08--deliver-the-selector-and-replacement-lifecycle) and the [technical design](../projects/renderer-comparison-tech-design.md).

## RCP-L02 — Initial backend and graphics API matrix

**Status:** Proposed — selected design, unimplemented. **Restrictiveness:** Medium.

Initially support PlayCanvas/WebGL2 and Three.js `WebGLRenderer`/WebGL2. Preserve the pinned PlayCanvas baseline during extraction; pin an exact compatible Three.js release and needed addons during implementation. PlayCanvas remains the ordinary default until the evidence/default decision.

Expose hot switching in scene-study and the existing live `import.meta.env.DEV` plus `?artLab` panel, mounted by the shared owner. Production live launches use explicit renderer/API URL selection. No permanent player HUD control or profiling side effect is selected. An early W0 probe may precede complete shared cloth/material extraction; only full declared parity qualifies broad timing comparisons.

Three `WebGPURenderer`/TSL and PlayCanvas WebGPU are later explicit experiments, not promised fallback-equivalent implementations. A run records requested and actual engine/API/pipeline. Unsupported features or API substitution cannot silently qualify a matched pair. This confines the first port while retaining a deliberate extension seam; it is not a claim that either engine lacks compute or modern GPU capabilities. See RCP06/RCP07/RCP12.

## RCP-L03 — Permitted replay recording envelope

**Status:** Proposed — selected diagnostic envelope, unmeasured. **Restrictiveness:** Safe.

One replay recording is limited to **120 seconds of timeline**, **32 MiB (33,554,432 bytes) of retained UTF-8 encoded manifest/timeline data**, and **10,000 timeline records**, whichever is reached first. View and control entries both count. External asset payloads are referenced exactly and remain governed by their existing asset owner; they are not embedded to evade this allowance.

Check remaining count/time before accepting an entry and enforce the byte allowance during bounded encoding before retaining it. Reserve enough bytes for the bounded manifest and terminal status/coverage before the first append, within the same 32 MiB allowance; finalizing an overflow reason cannot exceed the artifact limit. Do not first build an unbounded serialized copy. Stop before an offending append, retain explicit stop reason/coverage and mark the recording **incomplete**. An incomplete stream may support diagnosis but cannot produce a renderer winner or whole-workload parity claim. No silent dropping of records.

The values provide a practical finite comparison without a recording/archive service. They are not a limit on live session duration, world history, population or authority. Decoded heap can exceed encoded bytes; source/capture references and actual heap remain measured. Revisit only if a named useful workload cannot fit, after checking avoidable repeated input. See RCP09 and the [measurement contract](../performance/measurement.md).

## RCP-L04 — Default warm-up, measured duration and run order

**Status:** Proposed — selected repeatability defaults, unmeasured. **Restrictiveness:** Safe.

The default timed replay uses **10 seconds of explicit warm-up followed by 60 seconds of measured steady state**. Startup/download/decode and first-use preparation are separately reported. Custom positive finite phase durations are written into the manifest; warm-up plus measured timeline must fit within RCP-L03's 120-second total. Do not hide preparation within an unlabeled exclusion or call a preloaded run cold.

Run a finite **six-attempt campaign**, interleaved **A–B–B–A–A–B**; state which engine is A. Qualification requires three valid captures per backend. Preserve failed/invalid runs and reasons instead of automatically retrying until six favorable captures remain. Hidden/background execution, failed assets or unequal required work makes the affected comparison inconclusive. An explicitly repeated campaign preserves the prior summary and needs a stated variance or diagnosis question.

The existing browser driver's explicit renderer-comparison mode owns that campaign; scene-study's short measurement button remains a single-run diagnostic. Replay mode does not sign in, take control, select world speed, resume, write the live start marker or drive native commands. Headed/headless and graphics launch choices are recorded; real-display smoothness requires its actual display evidence.

These are inexpensive comparison defaults rather than statistical guarantees or game performance budgets. Use the same build/device/browser/quality conditions; report thermal/power changes. See RCP10/RCP11.

## RCP-L05 — Replay and report retention

**Status:** Proposed — selected design, unimplemented. **Restrictiveness:** Safe.

Retain at most **one active replay/current report** in the browser workflow, with bounded per-run results needed for the current comparison. Replacing or stopping it releases obsolete timeline/resource references and retires its measurement session. There is no background replay archive, automatic upload, accumulating capture history or server benchmark database.

Explicitly exported evidence follows existing verification/privacy/asset storage owners. A current report may summarize the prescribed run set; “one report” does not mean silently discarding unsuccessful runs. Capture identifiers and source/build revisions establish current-format integrity, not a legacy compatibility system. See RCP09/RCP10.

Live capture and its unexported private inputs are bound to the current access/view owner and cleared on logout, observer replacement or scope loss/renewal. Synthetic authored fixtures may exercise scope transitions without retaining another observer's private live input. This capture reset is independent of retaining still-permitted public scene resources during same-character renewal.

## RCP-L06 — Reuse existing optional measurement bounds

**Status:** Proposed consumer integration; existing collector bounds remain Current in their owner. **Restrictiveness:** Safe.

Use [OB01](observability.md#ob01--explicit-browser-performance-capture) for raw-sample, histogram, timer-query and diagnostic allowances, including its stated current gaps. Do not create a second per-engine profiler with different invisible limits. Bound additional backend metadata before copying it; missing, unavailable, omitted and zero remain distinct.

Collection is opt-in and disabled preparation is skipped. Stop releases measurement interest and handles; late GPU results cannot enter a new recording. GPU timestamps remain capability-dependent. Tracked resource counts and estimated bytes are labelled by scope and are not exact portable VRAM. Existing CPU/GPU spans can overlap and are never added as disjoint costs. See RCP10 and [browser profiling](../maintainers/performance-profiling.md#browser-frames-and-actual-walking).

Report callback cadence separately from actual draw/postrender cadence, counts and trailing no-draw time. A responsive scheduler with a frozen canvas is not a smoothness pass, and a submitted draw is not proof of physical screen presentation.

## RCP-L07 — No new renderer entity cap; scope and work remain explicit

**Status:** No limit — no additional project-wide entity/population cap selected. **Restrictiveness:** Too liberal for an unqualified claim of arbitrary scene scale; acceptable as an explicitly measured current workload boundary.

The presentation map grows with the currently permitted view and retained remembered images under their existing owners. View reconciliation can require O(N) membership work at a new-view boundary. Reuse unchanged source/appearance records; recurring motion/pose updates operate on the M moving/animated entries, rather than rebuilding all N representations every frame. Native visibility/culling and draw preparation may still visit scene objects; this is not a promise that every frame is O(M).

Supported authoring, observation changes and denser scenes can grow N, geometry, unique materials and assets. Scoped projection and dirty work do not by themselves establish a memory or frame-time ceiling. Report actual visible/animated/changed populations and retained resources; profile a relevant growth dimension when needed. Do not silently omit permitted subjects or meaningful updates to satisfy a timing target. This deliberate absence of a new cap avoids premature gameplay restrictions while keeping scale unqualified. See RCP02/RCP04/RCP11 and [spatial limits](spatial.md).

## RCP-L08 — Asset preparation, cache and native-resource boundaries

**Status:** Proposed consumer integration; existing asset admission remains controlling. **Restrictiveness:** Medium.

Reuse `asset-files.ts` and the [asset storage contract](../projects/game-asset-storage-tech-design.md) for exact selected releases, fetch queues, cancellation and byte/integrity policy. Add no unbounded shared source-byte cache. Reuse source bytes/prepared immutable geometry only within a declared owner/lifetime; backend-native decoded containers, mutable meshes/materials and GPU handles are independently owned.

The active backend may retain the assets needed for the permitted scene under existing family/residency policy. Removed/replaced resources lose ownership and dispose when safe; in-flight parser work remains accounted for until settled. Resource reuse must not let disposing one backend destroy another's objects. Source normalization and dimensions remain shared behavior. See RCP04/RCP05/RCP06/RCP08 and [3D art limits](3d-pixel-art.md).

Initial required artwork retains the opaque loading/readiness gate until required preparation and a completed device frame qualify the latest view. A device-ready factory result is not scene-ready. Existing runtime families that permit fallback keep that behavior; this project does not open initial entry with missing required art. Same-character access renewal reauthorizes the view without rebuilding still-valid public resources solely for renewal.

## RCP-L09 — Shared behavior without a lowest-common-denominator pipeline

**Status:** Proposed — selected architectural constraint. **Restrictiveness:** Medium.

Share presentation decisions, clocks, geometry/math and portable shader kernels where the actual consumers support them. Each backend owns material/pass bindings, shader preparation, animation execution and efficient native rendering. There is no mandatory identical batching, draw-call count, scene graph or GPU resource layout.

Feature coverage is explicit. A missing required cue/effect keeps that comparison incomplete; an experimental backend-specific improvement is separately labelled and evaluated in best-practical mode. Do not promise automatic arbitrary GLSL/WGSL interchange or force CPU work solely to increase a shared-code percentage. This balances genuine reuse against engine-specific quality/performance. See RCP05–RCP07 and the [technical design](../projects/renderer-comparison-tech-design.md).

Shared animation samples are absolute; adapters can derive native deltas from them without owning another wall clock. Normal-session blend semantics remain; install/seek resets a transient blend to the requested current clip/sample. Exact interrupted multi-clip fade continuity through a loading gap is not required. Cloth consumes current native pose anchors before vertex publication/drawing, with one evaluated pose across passes.

## RCP-L10 — Current-format captures and no new performance guarantee

**Status:** Proposed — selected scope; [development compatibility policy](../../AGENTS.md#development-save-policy) remains current. **Restrictiveness:** Medium.

Captures/settings produced by an incompatible development build may be rejected and recreated. No old-capture reader, saved-scene migration, version-suffixed parallel API or compatibility-only second implementation is required. Exact current build/schema/asset references still protect meaningful comparison and current runtime integrity.

No universal FPS, shared-code percentage, crowd capacity or migration winner is selected here. The 60 Hz/16.67 ms reference is a comparison aid where the display supports it. Existing named performance/art/device requirements retain their own acceptance. A valid slower result satisfies a required measurement; it does not satisfy an independent required performance pass. See RCP11/RCP12.

## Review and change triggers

All values above remain explicit in manifests and implementation. A failed required workload calls for fixing incorrect or unnecessary work first; expand a diagnostic allowance only for a named useful comparison and update this inventory with its rationale. There is no current request to populate [Limits to revisit](../maintainers/limits-audit.md) with every default. Broader device targets, new graphics APIs and long-term dual support use their existing product/evidence owners.

