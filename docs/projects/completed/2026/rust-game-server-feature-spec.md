# Rust game server

| Status    | Current progress                                                                                                    | Last updated |
| --------- | ------------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | The selected browser, gameplay and recovery journeys qualify for stand-alone Rust adoption on the measured opening. | 2026-11-19   |

## Goal

A player signs in, walks past wildlife, speaks to a person and returns later to the same living world. One Rust server can deliver that session, including the browser connection, simulation, NPC requests and background PostgreSQL saves. This is the delivery target. The browser keeps its current protocol. Installed worlds continue to own what people and animals can do, perceive and say.

In the earlier proof, Rust used less CPU advancing a small, freshly opened world. With four active players, the complete Node-hosted Rust server used 18.005 ms of server plus PostgreSQL CPU per completed game-second against 13.570 ms for TypeScript. On that workload it would need to remove 24.6% of its own cost to tie, or 32.2% to beat TypeScript by 10%. About 83% of the extra CPU in the run averages was in the server and 17% in PostgreSQL. That split does not tell how much of the cost the bridge caused. Testing a different boundary while both implementations can still play the same game avoids accumulating new TypeScript-only mechanics before finding out. [Matched ordinary play](../../../benchmarks/native-runtime-foundations/2026/2026-11-17-native-active-area-comparisons.md#repaired-matched-source-and-native-comparison) · [Clock comparison](../../../benchmarks/native-runtime-foundations/2026/2026-11-17-native-active-area-comparisons.md#small-world-walk-and-fresh-clock-measurements) · [Phase costs and attribution limits](../../../benchmarks/native-runtime-foundations/2026/2026-11-17-native-active-area-comparisons.md#whole-phase-native-profiling-and-e2)

## What players and operators must experience

- A login or reconnect shows the character's current permitted view. Walking changes position, uses real geometry, stirs nearby animals and can produce different observations and memories for different people. An observer cannot control the character or recover forgotten information from an old connection.
- NPCs continue their own activity while a player acts. An ordinary animal reaction runs locally. A decision that calls a provider uses that character's knowledge, existing spending and cancellation rules, and current-world validation. A valid conversation produces one saved answer. A refusal identifies its cause. A cancelled request cannot apply a late reply.
- The server acknowledges an ordinary command when the world accepts it. The regular one-second save commits accepted changes in order. Repeating a command after a lost response cannot apply it again. Cold reopening resumes the latest complete durable state. An administrator can separately recover a validated checkpoint without rewinding account rights, privacy or provider obligations.
- A blocked browser, a held provider request or a slow database leaves independent work able to progress within the existing resource limits. Backpressure, debt or refusal stays visible. Privacy, chronology and observation detail stay the same under load.

## The heavy ordinary-play comparison

Use **one controlled player, ten human NPCs, ten deer and five hares in one authoritative world**. Omit the bird from this comparison opening. Keep the real animal profiles, human activities, installed terrain, sight, hearing, attention, memory, clock and saves. This is a deliberate benchmark preset. Ordinary Main creation keeps its own population. Exercise player movement and actions through one real browser-style connection, with initial state and then streamed updates. The measured window is **180 real seconds after warmup**. The [execution recipe](rust-game-server-tech-design.md#1-freeze-a-playable-workload-rgs01) defines the activity witnesses and frozen schedule.

Three real minutes cover three game hours at the installed rate and many ordinary save opportunities. Use that window to compare sustained work in this busy scene. Use longer or more demanding measurements when memory growth, slow responses or capacity would change the decision. Verify reconnect and recovery separately from ordinary play. A broken required journey leaves its implementation unfinished. A complete and correct candidate can lose the performance comparison.

The earlier one-player wilderness run had seven people and twenty animals, a stream and an extra full-view request four times a second to put pressure on projection. The normal browser requests state on entry or explicit refresh and then consumes streamed updates. The Rust proof began with fewer supported families and later replicated them across four active areas. Shared bookkeeping improvements benefited TypeScript too. Neither the earlier 103.39% whole-server CPU nor the later 30.73% single-player and 77.53% four-player medians measure the incremental cost of adding a player. Compare identical openings, input, settings and completed work. Keep bird flight and other missing standard-opening families in NSC04. [Wilderness inputs](../../../verification/performance/bookkeeping/2026/2026-11-07-bk29-profile.md) · [TypeScript bookkeeping comparison](../../../verification/performance/bookkeeping/2026/2026-11-07-r1-r9-runtime.md#final-matched-integrated-qualification) · [One-player ordinary play](../../../benchmarks/native-runtime-foundations/2026/2026-11-17-warning-policy.md) · [Full-opening coverage](../../../maintainers/native-simulation-core-coverage.md)

## Scope and decision

The delivery target is a release executable that can start, serve and recover this gameplay with Node absent from the runtime environment. Build-time tools may prepare the browser and installed world artifacts. The database, identity service and model service retain their external roles. Full Main/Outings coverage, unrelated administrator and authoring surfaces, general multicore expansion and distribution remain with their existing owners. A selected-scenario success alone cannot switch the default for the full game.

**Required passes** are the browser, activity, NPC, failure, privacy, save and cold-continuation journeys in the [technical design](rust-game-server-tech-design.md). **Required measurements** are complete CPU, achieved game speed, visible response, durability, memory and database work. Run one planned comparison of complete servers after integration. Use a separate trial when a consequential implementation choice remains uncertain and a before/after result could change it. Controlled HTTPS responses qualify the application's decisions and effects. Live model quality, commercial capacity and player enjoyment require different evidence.

## Maintained records

- [Implementation sequence and handoff](../../../maintainers/completed/2026/rust-game-server.md)
- [Limits and comparison decisions](../../../limits/native-simulation-core.md#nsc-l10--stand-alone-rust-server-comparison)
- [Technical design](rust-game-server-tech-design.md) and [parent delivery stages](../../../maintainers/native-simulation-core.md#delivery-stages)
