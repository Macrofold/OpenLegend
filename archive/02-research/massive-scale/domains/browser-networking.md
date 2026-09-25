# Browser execution, synchronization and network protocols

[Research index](../README.md) · Current OpenLegend uses HTTP commands and SSE state delivery according to the inspected architecture. This chapter proposes protocol evolution, not an immediate transport replacement.

## The browser does not need the authoritative universe

Deliver the current permitted working set, not the whole world save. Keep private thoughts, hidden inventory, undisclosed identities and unauthorized geometry out of payloads. Hiding a field in React or making an object transparent is not access control.

The browser renders, interpolates and sends intentions. The server independently validates control, range, collision, resources, state versions and current permissions. Predicting a movement animation is compatible with server authority; trusting a client-reported harvest or position is not.

## Choose transport after defining semantics

| Transport | Useful starting point | What remains your responsibility |
|---|---|---|
| HTTP commands + SSE | Current approach; reliable command handling and server push | Scoped baselines, replay windows, proxy buffering, disconnects, backpressure and per-session authority |
| WebSocket | Bidirectional interaction and efficient application framing | Queue bounds, priority, replay/receipts, authorization, compression policy and reconnect |
| WebTransport | Independent reliable streams plus replaceable datagrams where needed | Protocol negotiation, compatibility/fallback, loss handling, application order and hosting support |
| WebRTC media | Voice/media paths where appropriate | Recipient permissions, TURN/SFU operations, consent/mute policy and caption parity |

MDN documents that ordinary WebSocket does not provide automatic application backpressure. Its dedicated WebTransport page currently marks the core API as Baseline 2026, newly available since March, while warning about older devices and varying feature support. Therefore neither “unavailable in browsers” nor “works for every player” is a sound default in September 2026. Validate the complete browser, proxy and hosting path. [S40](../sources.md#s40), [S41](../sources.md#s41)

SSE remains a valid option for the current interaction shape. Its documented reconnection/event-ID behavior does not implement your permission-aware game snapshot or guarantee that an old cursor can always be resumed. Verify HTTP/2 deployment and browser/tab behavior rather than inheriting historical connection-limit assumptions blindly. [S42](../sources.md#s42)

## Separate traffic by meaning

Reliable authoritative effects include accepted commands, inventory transfers, admitted speech and relevant evidence. Replaceable presentation includes a newer transform or cosmetic animation state. Large assets and exports belong on separate delivery paths. Telemetry should not compete unboundedly with gameplay.

An application message envelope should identify protocol version, world/timeline, owner generation, subscription/view identity, applicable sequence/revision, payload class and command receipt where relevant. Reuse existing generation checks instead of introducing conflicting meanings for `version`.

A dropped cosmetic transform can be replaced by the next one. A dropped inventory decrement cannot be treated the same way unless a subsequent authoritative inventory state and receipt resolve it. A delayed speech fragment belongs to its utterance and timeline, not whichever conversation is open when it arrives.

## Join and resume as explicit protocols

A proposed join path authenticates the session, resolves control, obtains admission to the current owner, builds a consistent permitted snapshot, records its baseline, then delivers changes after that baseline. Avoid the race where a snapshot is built, changes occur, and the subscription starts too late to see them.

Resume checks timeline/authority generation, permissions and whether the requested cursor remains within a retained replay window. Otherwise send a fresh permitted snapshot. Never bridge a restored timeline by pretending that numerical revisions from the old world are comparable.

Bound concurrent cold joins, snapshot bytes and snapshot CPU. Reconnect storms after a regional interruption can cost far more than steady-state deltas. Apply jittered retry and admission with clear UI feedback. A server restart should not trigger a synchronized million-client full-history download.

## Interpolation, prediction and fairness

Render remote actors from a short buffer of authoritative samples. Tune buffering against measured jitter and visual smoothness. For the locally controlled actor, limited prediction can improve responsiveness, followed by reconciliation against authoritative results. Use explicit command ordering and acknowledged inputs.

Riot's netcode account is valuable for the relationships among buffering, prediction, authority and fairness. Its shooter requirements are not a reason to copy a 128 Hz target into a tactical simulation. Fiedler's snapshot interpolation explains the complementary approach of smooth presentation from intermittent state. [S13](../sources.md#s13), [S14](../sources.md#s14)

Do not rewind the entire social world to compensate for one player's latency. Bounded combat rewind, should the game need it, requires a dedicated historical geometry and fairness contract. A historical hit test must not alter already acquired speech, commitments, trades or model outputs.

## Binary formats and compression are second-order until fanout is right

Start with observable schemas and measure bytes and encoding time. Binary layouts, field masks, quantized transforms, string dictionaries and delta compression become useful when bandwidth/CPU justify them. Choose field precision from gameplay and visual tolerances, not arbitrary byte targets.

Track baseline invalidation and dictionary versioning. Compression can spend significant CPU or leak information when private and attacker-controlled content share sensitive contexts; evaluate the exact scheme. Per-recipient filtering can prevent sharing a fully encoded packet, but common public fragments may still be reusable.

The dominant mistake is broadcasting irrelevant state efficiently. First reduce the authorized working set and change rate; then optimize representation.

## Keep the client main thread available

Separate React/UI state from high-frequency rendering transforms. Pool transient data where measured allocation pressure matters. Perform asset decoding, selected parsing or numerical work in workers when the serialization/transfer overhead is justified. Never copy the complete world every frame to a worker.

PlayCanvas' own optimization guide is the appropriate starting point for draw calls, batching, device capability and resource profiling. A browser benchmark must include CPU, GPU, frame-time tails, memory, thermal behavior, input latency and time to first playable scene—not just average FPS on a developer workstation. [S43](../sources.md#s43)

Version assets and client protocols. Existing sessions may run an older cached bundle during a server rollout. Define compatible schema evolution and a graceful mandatory-update path rather than letting stale clients submit ambiguous commands.

## Required network tests

Use mobile and desktop profiles, high RTT, jitter, packet loss, bandwidth limits, hidden/background tabs, proxy timeouts, changed Wi-Fi networks, duplicate commands, old tabs, stale generation, malformed payloads and mass reconnects. Inspect transmitted data for disclosure, not only rendered output.

Measure admission latency, command-to-durable-ack, commit-to-client, client processing delay, rendered correction, per-session queue bytes and resnapshot frequency separately. A single “ping” number cannot reveal where responsiveness is lost.
