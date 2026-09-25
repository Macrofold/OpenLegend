# Sound/speech and elapsed-time integration handoff

This is a coordination note, not a second hearing or simulation specification. [Simulation time](../simulation-time.md) owns clock/integration behavior. The sound branch owns its hearing/speech contract; preserve its canonical documentation when combining the branches. Work and validation remain with PF13, SW, EPR and the existing speech tracker.

## Inspected branches

Inspected `feat/hearing-speech-captions` at `97668413082446e08d1e1fa5c3ee788067a1c7ef` (PR #3), alongside the spatial elapsed implementation merged with main `03105fed`. Recheck tips before integration; this is not permission to overwrite newer work. The sound branch was read, not modified or merged by the cadence task.

The sound branch already implements graded dB hearing, whisper/normal/shout payload propagation, listener-specific stable fragments, scoped captions, listener candidate indexing, event/awareness batching, conservative status participation, unchanged static-object exposure reuse and episode-membership pruning. HE05 now batches bounded snapshots but explicitly retains one-game-second physics/sequence boundaries; that optimization must be reconciled with elapsed intervals, not layered on as a second cadence. Do not replace those hearing systems with the earlier spatial branch's binary 10 m / 0.65 gate or describe that older threshold shortcut as the new acoustic design.

## Recommended order

Integrate the spatial/elapsed-time branch into the common base first, then rebase or merge sound/speech onto it. This consolidates Recast/Rapier initialization, asynchronous route results, support-aware coordinates, the new interval contract and current world/persistence policy before resolving sound's event and presentation additions. If sound lands first for another reason, reverse the merge order but preserve these same responsibilities. Neither branch needs to wait for a general kinetic scheduler, volumetric acoustics or a higher-frequency renderer.

Do not resolve `kernel.ts`, `events.ts` or `world-service.ts` by choosing an entire side. Sound's batching and listener-specific evidence and spatial's elapsed integration solve different problems and must both survive. Keep the latest main's world ownership, status-effect and in-place persistence semantics. No new database, save reset or duplicate timer/store should result.

## Shared changes to reconcile

- `packages/domain/src/status-effects.ts`: the cadence work reuses sound's conservative `mayAdvanceStatusEffects` helper rather than designing another applicability registry. Keep one copy. Preserve cadence's separation of due-state reconciliation, starting-state rate capture and elapsed integration; do not restore `advanceStatusEffects(..., 1)` as the universal runtime.
- `packages/domain/src/object-exposure.ts` and `kernel.ts`: the cadence review reuses the sound branch's immutable static-exposure helper and unchanged episode-membership optimization. Keep one helper and cache. Its source/geometry/observer invalidation must remain intact; the cache stores IDs, not names/private evidence. Keep observer-private acquisition and capability gates. Sound's batched encounter emitter can replace repeated private acquisition calls only within one stable post-motion sensing phase.
- `packages/domain/src/kernel.ts`: each `advanceWorld` call can stop at a native boundary or computation limit. The caller must subtract actual `world.simTime` progress, not calls or requested seconds. Resolve due start transitions, move/integrate existing work, then commit endpoint effects and observations. Do not apply an interval's duration to an action created at its end. Keep collision sweeps and support seams.
- `apps/server/src/world-service.ts`: retain the existing host wake cadence but pass owed elapsed game time with a bounded interval count. Count actual advance and retain debt; preserve navigation/pause/command ownership and existing durability policy. Sound batching is not a reason to restore 60 or 480 mandatory whole-world steps per real second.
- `events.ts`, `speech.ts`, `acoustics.ts`, perception/awareness projection: calculate heard evidence at the committed emission state. A batch must not span a moving listener/source, changed opacity/noise/policy, sleep transition or authorization boundary merely because events arrived in one wall-time callback. Cache geometry transfer only while its dependencies match.
- Conversation expiry and status conditions use game time. Caption reading duration and interpolation use their explicit presentation/real-time clocks. Current speech occurrences have no simulated utterance duration; overlapping captions are not sustained competing noise sources.
- `apps/client/src/scene.ts`, world presentation and captions: retain full camera-facing sprite aspect, virtual physical depth, actual projected shadows and currently authorized local read-through. Caption anchors must use the displayed current/recent-past pose. State delivery at 20 Hz must not cap rendering or caption animation to 20 FPS.

## Guardrails for the new acoustic policy

Source SPL, 3D attenuation and listener floor determine candidate extents; shouting can reach beyond the former small hearing radius. Preserve all legitimate listeners. Don't silently truncate audience count, force the old radius cap, reroll fragments on repeated reads or use an observer's current location to reinterpret an old emission. T=0 is blocked, not serialized Infinity. Scope/name/intelligibility remain separate, and navmesh raycasts never become sensory raycasts.

A sparse physics interval is not permission to batch two different occurrence states into one acoustic snapshot. Immediate external speech commands interleave at the existing authoritative mutation boundary. Native speech emitted by a timed action must finish that interval at the speech time before later motion is integrated. A future sustained-speech mechanic must explicitly contribute start/end/interruption bounds.

## Joint acceptance to retain

No automated coverage is claimed by this note. TODO contains cadence/speech cross-cutting cases: emission immediately before/after motion, floor crossing, source deletion, volume changes and status/sense revocation; stable replayed partial fragments; 1x/8x caption reading durations; hidden/pause/load handling; actual progressed clock versus blocked navigation; batched event order; and all existing actor/name/privacy cases. The full combined auditory/3D/elapsed-time branch still needs runtime and stress observation after integration.

## Message for the sound-branch implementer

Keep your new acoustic calculations, listener index, batched evidence and caption clocks. The spatial branch now separates game-clock speed from integration frequency and retains continuous swept movement. Port your changes onto that boundary rather than copying the one-second loop back. The static-exposure and status-participation helpers are already being reused here; consolidate them, then resolve each shared kernel/event/service phase explicitly. No hearing re-authoring or new renderer is required for this integration.

## Coordination status

An integration note was posted on PR #3 (comment 5827327924), pointing out the obsolete 480-native-steps assumption, the shared helpers and the recommended merge order. The branch was inspected, not overwritten or merged by this task. Its PR body still contained older fresh-save instructions; current in-place preservation takes precedence. Recheck its tip before joining the branches and retain HE05's unqualified graphical/provider/scale gates.
