# Rust game server

| Status   | Current progress                                                               | Last updated |
| -------- | ------------------------------------------------------------------------------ | ------------ |
| Designed | Implementation and comparison are open. TypeScript remains the default server. | 2026-11-18   |

## Goal

A player signs in, walks past wildlife, speaks to a person and returns later to the same living world. One Rust server can deliver that session, including the browser connection, simulation, NPC requests and background PostgreSQL saves. This is the delivery target. The browser keeps its current protocol. Installed worlds continue to own what people and animals can do, perceive and say.

The earlier proof kept the application server in Node. In four active areas it completed the same gameplay as TypeScript but used 32.68% more median server-plus-database CPU per completed game-second. Rust used less CPU in a separate small-world fresh-clock comparison. Commands spent time waiting to enter the world, and views and saves crossed between two representations. These results justify trying a different boundary. They do not predict a win for this design or for a larger population. [Matched ordinary-play results](../benchmarks/native-runtime-foundations/2026/2026-11-17-native-active-area-comparisons.md#repaired-matched-source-and-native-comparison) · [Small-world clock comparison](../benchmarks/native-runtime-foundations/2026/2026-11-17-native-active-area-comparisons.md#small-world-walk-and-fresh-clock-measurements)

## What players and operators must experience

- A login or reconnect shows the character's current permitted view. Walking changes position, uses real geometry, stirs nearby animals and can produce different observations and memories for different people. An observer cannot control the character or recover forgotten information from an old connection.
- NPCs continue their own activity while a player acts. An ordinary animal reaction runs locally. A decision that calls a provider uses that character's knowledge, existing spending and cancellation rules, and current-world validation. An admitted conversation produces one saved answer. A genuine refusal identifies its cause.
- The server acknowledges an ordinary command when the world accepts it. The regular one-second save commits accepted changes in order. Repeating a command after a lost response cannot apply it again. Cold reopening resumes the latest complete durable state. An administrator can separately recover a validated checkpoint without rewinding account rights, privacy or provider obligations.
- A blocked browser, a held provider request or a slow database leaves independent work able to progress within the existing resource limits. Backpressure, debt or refusal stays visible. Privacy, chronology and observation detail stay the same under load.

## The heavy ordinary-play comparison

Use **one controlled player, ten human NPCs, ten deer and five hares in one authoritative world**. Omit the bird from this comparison opening. Keep the real animal profiles, human activities, installed terrain, sight, hearing, attention, memory, clock and saves. This is a deliberate benchmark preset. Ordinary Main creation keeps its own population. Exercise player movement and actions through one real browser-style connection, with initial state and then streamed updates. The measured window is **180 real seconds after warmup**. The [execution recipe](rust-game-server-tech-design.md#1-freeze-a-playable-workload-rgs01) defines the activity witnesses and frozen schedule.

Compare the same installed world and useful work in TypeScript, the current mixed server and the stand-alone candidate. Historical six-minute, full-view polling, four-area and held-reader runs retain their original meanings. Timing for login, cold recovery and administrative rewind is separate from steady play. Repeated correctness failures leave the affected implementation unfinished. A complete and correct candidate can legitimately lose the performance comparison.

## Scope and decision

The delivery target is a release executable that can start, serve and recover this gameplay with Node absent from the runtime environment. Build-time tools may prepare the browser and installed world artifacts. The database, identity service and model service retain their external roles. Full Main/Outings coverage, unrelated administrator and authoring surfaces, general multicore expansion and distribution remain with their existing owners. A selected-scenario success alone cannot switch the default for the full game.

**Required passes** are the browser, activity, NPC, failure, privacy, save and cold-continuation journeys in the [technical design](rust-game-server-tech-design.md). **Required measurements** are complete CPU, achieved game speed, visible response, durability, memory and database work. Worker scheduling, narrower reads and incremental view construction have to earn their own before/after results. Controlled HTTPS responses qualify the application's decisions and effects. Live model quality, commercial capacity and player enjoyment require different evidence.

## Maintained records

- [Implementation sequence and handoff](../maintainers/rust-game-server.md)
- [Limits and comparison decisions](../limits/native-simulation-core.md#nsc-l10--stand-alone-rust-server-comparison)
- [Technical design](rust-game-server-tech-design.md) and [parent delivery stages](../maintainers/native-simulation-core.md#delivery-stages)
