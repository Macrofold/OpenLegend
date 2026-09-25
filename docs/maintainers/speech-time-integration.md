# Sound/speech and elapsed-time integration handoff

This is a coordination note, not a second hearing or simulation specification. [Simulation time](../simulation-time.md) owns clock/integration behavior. The sound branch owns its hearing/speech contract; preserve its canonical documentation when combining the branches. Work and validation remain with [PF13](simulation-time.md), SW, EPR and the existing speech tracker.

## Integration state

`feature/simulation-cadence` and `feat/hearing-speech-captions` both contain the new main agent guidance. Recheck both tips before combining them; neither is authorization to overwrite the other's work. The cadence task reads the sound branch but does not merge or edit it. Exact inspected revisions and observations belong in [cadence evidence](../verification/simulation-cadence.md), not a moving implementation claim here.

Sound already implements graded dB hearing, whisper/normal/shout propagation, listener-specific stable fragments, scoped real-time captions, perceived-event history, listener-volume indexing and bounded geometry-transfer reuse. It also has conservative status participation, immutable static-object exposure reuse and episode-membership pruning. Cadence reuses those two small helpers; preserve one copy of each. Keep sound's latest dispatch/revocation/publication and embedding-batch guards, not only its visible captions.

Its current performance checklist still describes 8x as 480 mandatory one-second steps. That is superseded by the accepted clock contract: 480 game seconds per wall second is the requested elapsed-time rate, not the number of integration calls. Revise the checklist and profiler consumers during integration; do not restore a one-second loop to satisfy the old wording.

## Recommended order

Land or review the elapsed-time branch as the common integration base first, then rebase or merge sound/speech onto it. This consolidates Recast/Rapier initialization, pending route results, spatial support, elapsed integration and current persistence policy before resolving the event/presentation additions. If sound lands first, reverse the order but preserve the same responsibilities. Neither branch depends on a universal kinetic scheduler or volumetric acoustics.

Do not resolve shared files by selecting a complete side. In particular, retain cadence's start/rate/end phases in `kernel.ts` and `world-service.ts`, while preserving sound's batched acquisitions, recipient-specific evidence, conversation eligibility and revocation-safe derived writes. Keep current-main world ownership, nonblocking consolidation pressure and in-place save behavior. No new database, save reset, scheduler or writable store is needed.

## Shared changes to reconcile

- `status-effects.ts`: one `mayAdvanceStatusEffects` helper; preserve cadence's `reconcileStatusEffects`, `prepareStatusRates` and `integrateStatusRates`. Capture rates and conditional predicates at interval start for all subjects before applying endpoint effects. The effect-only helper is not the global integration loop.
- `object-exposure.ts`, `encounter-cache.ts` and `kernel.ts`: keep one ID-only exposure cache and the unchanged episode-membership optimization, including geometry/body/pose/range invalidators and capability gates. Sound's acquisition batching may replace repeated acquisitions only within one stable post-motion sensing phase. Its newer immutable physical-phase finalization/unchanged-exposure proof must apply per accepted elapsed interval, not once after an arbitrary multi-interval call. Keep touch moving-to-present transitions exact and retain command, status, body, geometry, policy and capability invalidation; an unchanged visual proof never skips speech admission.
- `kernel.ts`: `advanceWorld` returns a bounded elapsed prefix. `maxIntervals` bounds work, not game seconds. A newly arrived or newly created action receives none of the preceding interval's work. Preserve swept body checks and explicit support seams.
- `world-service.ts`: subtract actual `world.simTime` progress, retain debt, preserve navigation/pause/command fences and routine durability. Host wake frequency and one-second persistence policy are real-time coordination choices, not biological ticks.
- `events.ts`, `speech.ts`, `acoustics.ts` and perception/history: calculate heard evidence at committed emission state, retaining listener-specific full/partial/no-word content and identity scope. Do not replace graded exposure with the older binary radius/0.65 gate. Threshold-pruning arithmetic valid for that older gate is not automatically a dB-policy implementation.
- `draft.ts`, `experience.ts` and `status-capabilities.ts`: preserve sound's append/index/capability optimizations without creating duplicate mutation owners. Recheck snapshot identity and cache invalidation after the merge; passing compilation does not prove those integration boundaries.
- `scene.ts`, `main.tsx`, view/protocol: retain full camera-facing aspect and virtual depth, support-aware interpolation, shadows and authorized read-through alongside caption anchors. Caption anchors follow the displayed current/recent-past pose, never another actor's private future route.

## Independent event and presentation clocks

Speech is currently an instantaneous committed occurrence, not a sustained acoustic process. Sparse simulation is no reason to poll speech at the next interval or batch emissions across movement, changed noise/geometry, sleep or permission boundaries. External commands interleave through the normal mutation owner. A future native timed utterance must end the interval at its emission time; a sustained utterance needs explicit start/end/interruption boundaries.

Conversation inactivity and physiological deadlines use game time. Caption reading lifetime, presentation expiry and render interpolation retain their explicit real-time clocks and pause/hidden behavior. Overlapping captions do not imply physically competing noise. State publication at 20 Hz, if later adopted, is not a 20 FPS rendering limit.

## Acoustic guardrails

Source SPL, three-dimensional attenuation and listener floor determine candidate extents; shouting may exceed the former small radius. Preserve every legitimate listener and historical emission origin. Do not truncate audiences, reroll stored fragments, expose full original words through recall/history fallbacks, or reinterpret past hearing at a listener's current position. Navmesh rays are not sight/sound rays. Geometry caches store transfer, not listener permissions or semantic evidence.

## Joint acceptance to retain

Cross-cutting coverage belongs in [TODO](TODO.md), not a duplicate test list here. The combined branch needs actual emission-before/after-motion, stacked floors, sleep/sense changes, same-world restore, partial-text persistence and 1x/8x caption lifetime observations. Record advanced time, pending navigation, debt and real event counts. Neither branch's individual evidence qualifies the combined application automatically.

## Message for the sound-branch implementer

Use `feature/simulation-cadence` as the time-integration side. Keep your graded acoustics, receiver index, transfer reuse, batched evidence, real-time captions, latest experience-index/finalization work and asynchronous safety fixes. Reconcile shared helpers and each kernel/service phase, rather than copying a one-second loop back. Remove the 480-ticks-per-second assumption from HE05 and stress tooling: report game-time progression and measured integration calls separately. Caption animation remains at browser frame cadence. No hearing re-authoring or new renderer is required.
