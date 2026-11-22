# Horizon server: lessons for Open Legend

| Evidence                  | Scope                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Inspected                 | November 22, 2026; source inspection, without executing either repository's tests or benchmarks                                                        |
| Horizon                   | `Far-Beyond-Dev/Horizon`, `main` at `98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c`                                                                         |
| Open Legend               | `Macrofold/OpenLegend`, `codex/native-simulation-proof` at `fb7f0923c856ee9b5d7a9c72f3465210b3e806a4`                                                  |
| Maintained follow-through | [Multiplayer delivery specification](../../docs/features/multiplayer-delivery/README.md), [multiplayer tracker](../../docs/maintainers/multiplayer.md) |

## Assessment

Horizon is most useful as a reference for multiplayer delivery: selecting recipients, choosing which object fields to send, sharing encoding, controlling slow connections, and separating reliable events from disposable motion updates. Its concrete networking work offers several good implementation examples. It does not establish a superior deterministic simulation core, mature gameplay implementation, or proven distributed persistent world.

The right adaptation is to improve Open Legend's existing publication owners where evidence supports a change. Replacing its authority, simulation scheduler, privacy model, or world-definition boundary would discard stronger project-specific guarantees. This dossier preserves research findings and dispositions; the linked specification owns proposed behavior and experiments, and the tracker owns delivery status. Source-backed observations below describe the pinned revisions, not perpetual claims about either project.

## What Open Legend already provides

| Concern             | Current native implementation and implication                                                                                                                                                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slow readers        | `native/game-server/src/player_stream.rs` holds one pending operation and a previous view, watches the latest revision, and prepares at a 50 ms cadence. `socket.rs` applies a 30-second blocked-write deadline. Horizon does not introduce the need for bounded delivery. [OL1], [OL2]                    |
| Incremental state   | `player_view/patch.rs` compares against that stream's last handed-off view and chooses unchanged, reset, or a patch with additions, updates, and removals. Changed access/privacy context requires a reset. This already avoids sending every complete view. [OL3]                                         |
| Encoding and memory | `wire.rs` sizes the selected payload, reserves its allocation, encodes it, and keeps reservation ownership with the detached `Bytes`. It has a sizing traversal plus encoding, not a magical single traversal. Sharing must retain accurate lifetime accounting. [OL4]                                     |
| Disclosure          | `player_stream.rs` and `world.rs` recheck current authority and relevant evidence at the final handoff. Sharing a spatial neighborhood cannot replace that per-recipient decision. [OL1], [OL5]                                                                                                            |
| Spatial queries     | `native/simulation/src/movement.rs` maintains a derived 3D body grid, updates changed bodies, selects between occupied-cell and query-volume traversal, and preserves deterministic ordering. A spatial index is already present. [OL6]                                                                    |
| Simulation work     | The interval driver advances to relevant mechanical, input, and sensory boundaries. The world host bounds runnable work; the NPC scheduler coalesces changed-actor wakes and uses urgency with aging. Async event dispatch is not an upgrade to these ownership and scheduling rules. [OL7], [OL8], [OL14] |
| Player references   | `player_references.rs` already produces compact 24-character keyed personal/evidence references. Body, person, and historical-reference roles differ. A new wire handle must not replace their authority or privacy meaning. [OL9]                                                                         |

These are implementation observations, not large-population qualification. The current native matched benchmark uses a Base opening with one player, 25 NPC/animal actors, and 1,246 scenery records. Older 100-account SSE burst evidence belongs to its own implementation and includes unacceptable release latency; neither establishes thousands of native players. [OL10], [OL11]

## Transferable delivery lessons

### Separate information needs from transport choices

Horizon objects declare replication layers with selected fields, spatial reach, and delivery class. The useful principle is that a nearby participant, a distant observer, and someone deliberately inspecting an object need different detail. The exact channel numbers, distances, and space-game vocabulary are authored policy, not universal engine rules. [H1]

For Open Legend, keep four questions separate: what exists, what must be simulated, what a character can know now, and what a connection needs to display. A distant animal can remain physically active without every observer receiving its detailed pose. A remembered person can remain known after leaving sight without continued live tracking. A capability such as hearing or deliberate inspection can require different information from ordinary visual presentation.

Recipient selection must first preserve current grants, perception, private history, and relevant evidence. Distance is a candidate filter, not permission. Presentation detail must not silently change hearing, danger, work progress, resource availability, or NPC choices. A lower simulation frequency is a separate mechanic/performance decision with its own evidence.

### Share genuinely identical prepared results

The live `deliver_gorc_event` builds at most one encoded frame per listener format for an emission, then clones immutable `Bytes` for subscribers. Large frames can also reuse compressed bytes: `ListenerCompression` retains the most recent source allocation and its compressed result. Retaining the original makes its pointer/length cache key valid for that local fan-out. [H2], [H3]

Open Legend can investigate a shared public fragment or equivalent authorized representation, but a whole viewer-specific patch is usually different: recipients have independent previous views, evidence, references, removals, and control state. Reuse needs the same relevant inputs and lifetime, with independent final permission checks. Forming a sharing group, computing keys, retaining buffers, and invalidating it can cost more than recomputation. Prefer one demonstrated repeated preparation over a general cache framework.

Sharing encoding does not remove network fan-out. One encoded update for a thousand recipients still requires a thousand deliveries. It also does not justify sharing private command identifiers or internal world identity to make frames easier to combine.

### Bound backlog and distinguish outcomes from superseded state

Horizon gives each connection a nonblocking ordered outbox. A full fast channel moves later frames into that connection's backlog; subsequent frames stay behind older ones. Separate control traffic lets pong and close requests bypass game-data backlog. The writer groups already-ready frames before flushing. This prevents one slow socket from blocking producers. [H4]

Its concrete policy should not be transplanted: the backlog can reach 256 MiB per connection or remain behind for 60 seconds, in addition to a frame-count-bounded fast queue. The age cut is checked on subsequent pushes. "Never drops reliable frames" describes retention until disconnection, not guaranteed application delivery after a connection fails.

Open Legend already coalesces latest revisions and closes stalled writers. The useful extension is explicit semantic treatment of outgoing information: newer movement may supersede older movement, while command outcomes, inventory changes, disclosure removals, and lifecycle transitions need coherent recovery. A missing intermediate position must not lose an item transfer or leave a vanished object visible. Queue bounds must count actual bytes and retained preparation, not just messages; reconnect must establish a current authorized baseline. [OL1], [OL2], [OL3]

### Keep lifecycle messages explicit

Horizon sends zone-entry state before ordinary subscription updates and zone-exit messages when membership ends. This is a useful model for separating initial baseline, subsequent changes, and removal. [H5]

Open Legend must distinguish leaving the transmitted set, losing current perception, forgetting protected information, changing appearance, and actual destruction. They have different consequences for client caches and character knowledge. A reconnect, control replacement, privacy change, or restore cannot reuse a baseline whose evidence is no longer current. Existing reset/patch and disclosure owners already enforce much of this; new sharing or delivery classes must compose with them rather than introduce another lifecycle authority.

Boundary stability also matters. Hysteresis can prevent repeated enter/exit traffic near a threshold. Use it only where delayed removal is permitted: it must never retain revoked private data or fabricate continued sight. Horizon has hysteresis code, but the inspected live membership path does not establish its use. [H6]

### Keep protocol and transport experiments independent

Horizon separates frame format from delivery transport. Its binary protocol uses server-local 32-bit object handles after entry, 16-bit declared event identifiers, and a sequence counter per object/channel. That reduces repeated names and supports identical frame bytes across recipients. It also creates handle lifetime, reconnect, unknown-object, sequence-wrap, and ordering obligations. Open Legend's existing opaque references remain authoritative. [H7], [OL9]

WebTransport sends reliable frames on a stream and eligible unreliable frames as datagrams. It drops unreliable frames when behind or too old and records fallback/drop counters. The WebSocket writer instead sends those frames reliably; it does not apply the same stale-update shedding. Thus a meaningful replaceable-state policy can be investigated on the current transport before adding QUIC/WebTransport. Client handling must cope with an unreliable update arriving before its reliable object baseline. [H8]

Compression is similarly conditional. Horizon compresses only above a threshold and only when the result is smaller, batches small frames, and reuses Zstd contexts. Its Criterion suite compares JSON, bitcode serde/derive, single frames, batches, compression, and decompression; a separate example reports sizes with dictionaries. These are useful experiment structures, not recorded performance wins. Include browser decode/paint cost and batching delay, not only server encoding time. Bitcode's exact dependency pin is an interoperability constraint, not a reason to adopt that codec. [H3], [H9], [H9a], [H9b], [H9c]

## Implementation claims that need qualification

| Horizon component                             | What the pinned source establishes                                                                                                                                                                       | Disposition                                                                                    |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Live subscriber delivery                      | Instance subscriber sets feed the real sender; typed emission shares bytes by format.                                                                                                                    | Useful reference after privacy and lifecycle adaptation. [H2]                                  |
| Layer rates/compression                       | Frequency metadata is not enforced by the live emission path; layer compression is deprecated and has no wire effect. Listener compression is a different, active mechanism.                             | Do not infer working rate control from fields/configuration. [H1], [H2], [H3]                  |
| Alternate complete system                     | `CompleteGorcSystem` is deprecated because its `ServerContext::send_to_player` route does not reach clients.                                                                                             | Trace actual callers instead of combining alternate paths into one claimed architecture. [H10] |
| Proximity/relationship/interest subscriptions | Useful policy categories exist, but proximity recalculation only updates statistics in that manager. Live delivery uses a different subscriber owner.                                                    | Conceptual input, not a ready recipient-policy implementation. [H11]                           |
| Multicast and virtual zones                   | Multicast broadcast counts recipients without network delivery. Virtualization is exercised in tests, not the production tick; live membership does not consume virtual zones.                           | Group sharing remains an experiment. [H12], [H22]                                              |
| Spatial optimization                          | An R-tree exists, but important live membership paths scan all players/objects. Virtual-zone formation uses pairwise overlap checks; the named bounding-sphere helper uses centroid plus maximum radius. | A named data structure or algorithm does not prove complete-path complexity. [H13], [H12]      |
| Security and health                           | Live size/decode/ban checks are real. The separate rate-limit/security manager is not wired into the inspected accept/router path; health metrics include zero placeholders.                             | Verify protections and metrics from the real entry point. [H14a], [H14b], [H14c], [H14d]       |
| Atlas integration                             | Server registration and heartbeat are implemented; shutdown/config commands are TODOs, some reported measurements are zero, and HTTP blocks inside async code.                                           | Not evidence of distributed simulation or entity migration. [H15]                              |

The most general lesson is to distinguish code that exists, code used by the application, and behavior proven through the real caller. Configuration, helper tests, and documentation can describe a plausible design while the live path uses another owner.

## Gameplay and authored-world lessons

Horizon supplies a space-game demonstration, not a collection of mature gameplay systems to transplant. Its best gameplay idea is graduated information and participation: tracking movement at one range, perceiving an interaction at another, and deliberately inspecting for more detail. That can inform Open Legend's own sight, hearing, investigation, and knowledge systems without making space-game ranges or channels engine laws.

The inspected demonstration has material gaps:

- Movement's registered helper accepts absolute client positions without using the separately defined movement validator. A smooth visual demo is not proof of authoritative movement, collision, navigation, or freeform climbing. [H16a]
- Combat broadcasts attack requests; it does not establish a complete authoritative damage system. Terrain/block requests validate identifiers/coordinates and broadcast, without proving persistent terrain edits, material conservation, destruction, or resource recovery. [H16b]
- Scanning accepts client-authored metadata and emits through a channel not declared by the demonstrated player object. This does not establish acquired knowledge or reliable inspection mechanics. [H16c], [H16e]
- A private-chat target field is not a recipient filter: the active path fans the event to the channel's subscribers. Addressed, overheard, public, and private communication need explicit world and disclosure owners. [H16d]

Useful positive scenarios are therefore design prompts: notice a distant figure without its private details; hear a nearby action without seeing its actor; inspect an accessible object to learn additional permitted facts; return after sight loss without confusing memory with live observation. They must use Open Legend's actual perception, knowledge, action-admission, and world-profile contracts. Networking convenience cannot grant knowledge, fabricate contact, or make an action valid.

## Architecture choices to preserve or avoid

Keep one semantic mutation owner and deterministic world transitions. Horizon's main event bus serializes internal events to JSON and deserializes for each handler, executes concurrent callbacks, and logs some failures while returning success. Some handlers bridge through blocking execution or detach work. Its periodic tick emits a wall-clock timestamp and count; that is not an equivalent to Open Legend's accepted-interval driver. The purported serialization pool is explicitly a placeholder, and comments describing lock-free/SmallVec behavior do not match the actual map/vector design. [H17a], [H17b], [H17c], [H17d], [H23], [OL7]

Use typed direct calls for authoritative computation and explicit committed events for downstream consumers. An event bus may help independent notifications, logging, or tooling; it should not hide mutation order, partial failure, cancellation, or receipt ownership. The newer Horizon client route does illustrate a good boundary: take the sender identity from the real connection, not a client-supplied field. [H18]

Native plugins are not isolation. Horizon loads native libraries into its process, passes Rust trait objects across that boundary, and checks compiler/crate version strings. Lifecycle panic wrappers do not sandbox memory faults or untrusted generated code. The live manager lacks a demonstrated hot-reload lifecycle; another universal plugin framework is not the manager used by the server. Shutdown waits and counters do not prove every callback has released its library. [H19]

Open Legend should preserve trusted native capabilities with authored world definitions, not import native plugins merely to obtain modularity. Distinct modules and narrow interfaces can support replaceable policy without dynamic loading, a second event framework, or a new authority service. Cross-server ownership, atomic transfers, continuation, privacy, and recovery remain separate future work. Spatial filtering cannot solve a crowd whose members all require meaningful mutual interaction: necessary deliveries and interactions still grow with that workload.

## Experiments and prior decisions

| Question                                                                          | Research disposition                                                                                                                                           |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Are lifecycle, slow-reader, and delivery-class guarantees explicit and connected? | Foundational follow-through belongs in the linked delivery specification; preserve current authority and recovery before performance substitutions.            |
| Do equivalent recipients repeat expensive permitted work?                         | Measure a narrow shared-fragment candidate, including keying, invalidation, retained memory, and individual final checks. No blanket view/byte sharing.        |
| Does recipient/detail selection dominate?                                         | Profile complete live selection before introducing subscription indexes, hysteresis, or groups. Preserve exact eligible membership and prompt removals.        |
| Is wire cost material?                                                            | Compare current JSON with a compact representation, then compression/batching separately. Retain only complete-path benefits with unchanged required behavior. |
| Is reliable-stream delay material for replaceable updates?                        | Evaluate stale-state policy first; WebTransport remains a later transport experiment with explicit browser and recovery obligations.                           |
| Would virtual zones, native hot reload, or distributed servers help now?          | No adoption based on this repository. Require a demonstrated bottleneck and a separately owned design.                                                         |

Do not revive rejected Open Legend approaches merely because Horizon uses similar terminology. The stand-alone Rust design leaves dirty-section preparation conditional and records withdrawal of the earlier width-two publication and same-character capture-sharing candidates. The native hot-path report did not retain current-field, location/body, description-field, or related-track reuse as a repeatable CPU improvement. Related-track work worsened movement p95 in all three pairs. Pending-save tables, a one-pass work-row encoder, and an equal-attention-row shortcut also did not earn adoption. [OL12], [OL10]

That report retained narrower recent-event/warning preparation, scoped preferences/usage separation, and original NPC reply input for their particular demonstrated benefits; several complete-CPU comparisons remained inconclusive. Optional NPC discovery had a measured gain on its defined workload, but that is authored NPC behavior, not permission to reduce unrelated sensing or animal activity. Preserve those dispositions and their measurement conditions. An earlier 128 MiB resource-profile rejection is not evidence against every recipe at another allowance, nor evidence that a previously rejected recipe is now beneficial. [OL10], [OL13]

## Evidence quality and practical limits

Horizon includes useful local-socket tests for slow readers, recipient isolation, protocol mismatch, compression bombs, datagrams, and certificate reload. Its client workload generator varies population, activity, format, compression, and transport. However, the bitcode workload omits chat/combat/scanning, selects a controlled handle from zone-entry traffic, and reports counts rather than asserting meaningful gameplay outcomes. The ordinary Rust CI workflow builds with its test command commented out. A linear scan can pass the repository's per-object-cost test labeled sublinear; another zone workload does not populate the player-position state needed for its advertised population. [H20], [H25], [H26], [H27], [H28]

Preserve the positive testing idea: use actual permitted and excluded recipients, enter/exit, slow readers, reconnect, and changed state through the real network. Measure accepted simulation progress, correct state, private-data absence, memory settling, and end-to-end latency alongside messages per second. A test source is not a passed test, a frame count is not a committed action, and an idle connection count is not a busy-world capacity result.

Source inspection also exposes composition risks: mutable instance clones can fail to update authority; small movement steps can leave subscriber sets stale; an older broadcast path sends a second JSON event; and an oversized already-compressed unreliable frame can lose its wrapped flag during reliable fallback. These are cautions against wholesale adoption, not reproduced runtime failures from this investigation. The complete lesson is to qualify combined format, delivery, compression, lifecycle, and recipient paths rather than infer correctness from their isolated helpers. [H21], [H13], [H23], [H24]

No benchmark in this investigation establishes a comparative Horizon/Open Legend speedup, thousands of supported active players, or player enjoyment. Existing Open Legend evidence keeps its exact revision, hardware, workload, and unqualified dimensions. Future work must produce new applicable evidence through the maintained delivery and performance owners.

## Pinned evidence

The source markers above link to immutable files at the inspected commits. `H` identifies Horizon; `OL` identifies Open Legend. Local links lead to maintained follow-through, whose delivery status may advance beyond this research snapshot.

[H1]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/horizon_event_system/src/gorc/channels/layer.rs
[H2]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/horizon_event_system/src/system/emitters.rs#L306-L385
[H3]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/game_server/src/connection/compress.rs
[H4]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/game_server/src/connection/outbox.rs
[H5]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/horizon_event_system/src/system/emitters.rs#L390-L568
[H6]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/horizon_event_system/src/gorc/zones.rs
[H7]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/horizon_protocol/src/frame.rs
[H8]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/game_server/src/transport/webtransport.rs
[H9]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/horizon_protocol/benches/codecs.rs
[H9a]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/horizon_protocol/src/compression.rs
[H9b]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/horizon_protocol/examples/frame_sizes.rs
[H9c]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/Cargo.toml
[H10]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/horizon_event_system/src/gorc/system.rs
[H11]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/horizon_event_system/src/gorc/subscription.rs
[H12]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/horizon_event_system/src/gorc/virtualization.rs
[H13]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/horizon_event_system/src/gorc/instance.rs
[H14a]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/game_server/src/server/handlers.rs
[H14b]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/game_server/src/messaging/router.rs
[H14c]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/game_server/src/security/mod.rs
[H14d]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/game_server/src/health/mod.rs
[H15]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/game_server/src/atlas_client.rs
[H16a]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/plugin_player/src/handlers/movement.rs
[H16b]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/plugin_player/src/handlers/combat.rs
[H16c]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/plugin_player/src/handlers/scanning.rs
[H16d]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/plugin_player/src/handlers/communication.rs
[H16e]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/plugin_player/src/player.rs
[H17a]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/horizon_event_system/src/system/emitters.rs#L728-L793
[H17b]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/horizon_event_system/src/system/cache.rs
[H17c]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/horizon_event_system/src/system/core.rs
[H17d]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/game_server/src/server/core.rs#L708-L752
[H18]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/horizon_event_system/src/system/typed_client.rs
[H19]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/plugin_system/src/manager.rs
[H20]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/player_test_client/src/main.rs
[H21]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/game_server/src/transport/webtransport.rs#L417-L427
[H22]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/horizon_event_system/src/gorc/multicast/manager.rs#L222-L242
[H23]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/horizon_event_system/src/system/handlers.rs
[H24]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/horizon_event_system/src/system/management.rs
[H25]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/game_server/src/ws_tests.rs
[H26]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/game_server/src/webtransport_tests.rs
[H27]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/.github/workflows/rust.yml
[H28]: https://github.com/Far-Beyond-Dev/Horizon/blob/98c8f3e2e3e7fa4e5b009ef6ae6be96aa6e4983c/crates/horizon_event_system/src/gorc/tests/performance_test.rs
[OL1]: https://github.com/Macrofold/OpenLegend/blob/fb7f0923c856ee9b5d7a9c72f3465210b3e806a4/native/game-server/src/player_stream.rs
[OL2]: https://github.com/Macrofold/OpenLegend/blob/fb7f0923c856ee9b5d7a9c72f3465210b3e806a4/native/game-server/src/socket.rs
[OL3]: https://github.com/Macrofold/OpenLegend/blob/fb7f0923c856ee9b5d7a9c72f3465210b3e806a4/native/game-server/src/player_view/patch.rs
[OL4]: https://github.com/Macrofold/OpenLegend/blob/fb7f0923c856ee9b5d7a9c72f3465210b3e806a4/native/game-server/src/wire.rs
[OL5]: https://github.com/Macrofold/OpenLegend/blob/fb7f0923c856ee9b5d7a9c72f3465210b3e806a4/native/game-server/src/world.rs#L835-L899
[OL6]: https://github.com/Macrofold/OpenLegend/blob/fb7f0923c856ee9b5d7a9c72f3465210b3e806a4/native/simulation/src/movement.rs
[OL7]: https://github.com/Macrofold/OpenLegend/blob/fb7f0923c856ee9b5d7a9c72f3465210b3e806a4/native/simulation/src/time/advance/drive/slice.rs
[OL8]: https://github.com/Macrofold/OpenLegend/blob/fb7f0923c856ee9b5d7a9c72f3465210b3e806a4/native/game-server/src/npc/schedule.rs
[OL9]: https://github.com/Macrofold/OpenLegend/blob/fb7f0923c856ee9b5d7a9c72f3465210b3e806a4/native/game-server/src/player_references.rs#L376-L414
[OL10]: https://github.com/Macrofold/OpenLegend/blob/fb7f0923c856ee9b5d7a9c72f3465210b3e806a4/docs/benchmarks/native-runtime-foundations/2026/2026-11-20-rust-hot-path-comparisons.md
[OL11]: https://github.com/Macrofold/OpenLegend/blob/fb7f0923c856ee9b5d7a9c72f3465210b3e806a4/docs/maintainers/multiplayer.md
[OL12]: https://github.com/Macrofold/OpenLegend/blob/fb7f0923c856ee9b5d7a9c72f3465210b3e806a4/docs/projects/completed/2026/rust-game-server-tech-design.md
[OL13]: https://github.com/Macrofold/OpenLegend/blob/fb7f0923c856ee9b5d7a9c72f3465210b3e806a4/docs/projects/native-runtime-foundations-tech-design.md
[OL14]: https://github.com/Macrofold/OpenLegend/blob/fb7f0923c856ee9b5d7a9c72f3465210b3e806a4/native/world-host/src/dispatch.rs
