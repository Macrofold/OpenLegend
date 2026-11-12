# Native simulation core and adaptive execution

| Status      | Current progress                                                                                                          | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Focused fixes pass, but full held gameplay exposes a receiving mismatch; resource, cost and E2 qualification remain open. | 2026-11-12   |

## 1. Purpose and selected direction

The [prior trial decision](../maintainers/native-simulation-core.md#nsc03-measured-disposition--november-11-2026) rejects the 64 MiB profile. Mike selected provisional 128 MiB transient requalification and completion of NSC02/NSC03; adoption remains unproved.

Make the ordinary OpenLegend opening comfortably responsive, and make additional active people and places affordable without sacrificing individual knowledge, independent characters or meaningful consequences. The intended scale is dozens and ideally hundreds of active characters, with many simultaneous players distributed through a continuous world. These are design goals, not measured capacity claims or a promise that an arbitrarily large battle fits one machine.

The selected direction is a resident simulation core with explicit state ownership, compact mutable working data, bounded immutable consumer captures and flexible parallel jobs. **Rust is the selected proof candidate, not an unconditional commitment to replace the entire implementation.** First deliver and compare a complete smaller gameplay pipeline; migrate the remaining core only after the proof's adoption gate passes. TypeScript remains appropriate for application services, provider execution and the existing browser client. This is not a rendering-engine replacement.

Design authorization covers these documents. Runtime implementation, dependency installation, paid experiments and deployment require the ordinary task authorization. Later-stage entry conditions below remain controlling even after implementation is requested.

OpenLegend is an authoritative multiplayer world. Login, reconnect and returning expose the player’s permitted view of the current server world. Ordinary background saving belongs in gameplay measurements; cold server startup and administrative checkpoint recovery are separate windows. Player-controlled rewind is outside the intended normal flow.

NSC01–NSC03 implementation is now authorized on the stealth-runtime source line. The [delivery tracker](../maintainers/native-simulation-core.md#current-progress) owns the frozen comparison base, caller/field inventory, prior rejection and current remaining-work checklist. Successful NSC02/NSC03 exits remain unmet; no later stage follows without the new supported adoption decision.

## 2. Player value

The distinctive benefit is a world whose people can act, notice and remember while the player does something else: a companion sees only part of an encounter; a witness remembers an approach; a threatened animal changes its route without announcing a new crisis at every waypoint; another player arrives with different knowledge. The player should be able to pursue, cooperate, retreat or improvise across an administrative machine boundary without a reset of the situation.

This enables existing repertoire goals rather than adding another activity catalogue: [persistent movement and observation](../repertoires/actions.md#rel-relational-and-persistent-movement), [cooperation](../repertoires/actions.md#coop-cooperation-and-shared-activities), [conflict](../repertoires/actions.md#cbt-conflict-defense-and-tactical-action) and [the first playable loop](../repertoires/gameplay-priorities.md#the-game-we-need-to-be-able-to-play). More NPCs are useful only if their choices, knowledge and consequences remain legible. Throughput alone does not establish fun or believable model decisions.

## 3. Decisions and experiments

| Classification               | Decision                                                                                                                                                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accepted architecture target | One semantic owner per quantity/operation; private active state remains resident; no whole-world conversion across the language boundary on each update.                                                                                  |
| Accepted architecture target | Separate ownership from scheduling. A cell is neither a core nor a machine-capacity limit. Independent jobs can run on any suitable worker.                                                                                               |
| Accepted architecture target | Preserve exact supported outcomes, personal acquisition, independent freshness, ordered chronology, correction/forgetting and current-format restoration.                                                                                 |
| Accepted architecture target | Use existing application authority, receipt, persistence and AI owners. Keep authored laws/content in world owners, including when their implementation becomes Rust.                                                                     |
| Accepted staged target       | Efficient single-machine execution precedes distributed placement. Distributed execution has seamless same-world geography and explicit ownership handoffs, not mandatory loading screens or another copy of the world per player.        |
| Accepted staged target       | Group stable geographic cells into adjustable machine assignments. Dense places may use fewer cells per machine; quiet places more. Prefer keeping expensive interactions local subject to CPU, memory and service headroom.              |
| Experiment                   | Rust's complete-path benefit over the current implementation and a narrow equivalent compact-state TypeScript control. Native code alone is not proof of improvement.                                                                     |
| Experiment                   | Parallel job sizes, worker count, component layout, selective capture strategy and native boundary encoding. Adopt only demonstrated net improvements.                                                                                    |
| Experiment                   | Cell size, locality placement, ownership buffers and migration thresholds. Include their monitoring, copying and synchronization costs.                                                                                                   |
| Conditional experiment       | Independent regional advancement and cross-machine execution of coupled interactions. Correctness and complete-path benefit must pass before enabling these paths.                                                                        |
| Not selected                 | Whole-world per-tick snapshots, per-person processes, a universal actor framework, full previous-machine replicas, a new database/broker, speculative event rollback, a new LLM call loop, or a wholesale C++/Rust port before the proof. |

No performance gain is guaranteed, including from the accepted foundation. Ownership/privacy requirements are firm invariants; their representation, scheduling, bridge, rollback and distribution implementations remain experiments with complete before/after correctness and performance assessment. The [technical experiment ledger](native-simulation-core-tech-design.md#10-experiments-and-adoption-gates) names controls, added work and removal conditions. A rejected experiment is removed from the adopted implementation, not kept as another permanent runtime mode.

## 4. Gameplay and privacy contracts

The redesign preserves existing defaults. It does not choose slower sight, fewer animals, fewer attention allocations, a different world clock, coarser collision, weaker evidence, or new memory expiry to make a comparison pass. Independent behavior changes belong to their existing owners and must be applied equally to comparison arms.

- Movement and native reactions follow installed laws and actual elapsed game time. Work placement does not move bodies, repeat an action, draw randomness or restart a timer. Computed work is private until current input/authority checks accept it; work rejected for expired input leaves no movement, randomness, history or progress behind.
- A sustained activity can contain many physical execution steps. Its world-selected public transitions and personally received trajectory remain distinct. The common runtime removes generic animal-response announcements and eligible routine walking notices through the [BK29](../maintainers/production-data.md#bk29--pressure-and-preparation-work-removal-proposed) owners; native execution preserves those removals without a replacement announcement system.
- Broad perception remains wider than detailed attention. An attended subject needs no special follow/watch action to have its received changes recorded. Attention controls detailed work; required evidence retains its separate contract. Nearby copies held for server computation grant no personal knowledge.
- Unknown people stay unknown. Location updates cannot refresh stale clothing/name/detail, and receiving a new name cannot rewrite earlier recognition. Attention entry cannot reconstruct an unobserved route from objective state.
- The daughter/cliff/pursuers scenario retains broad bodies, personally received terrain/context and selected chronology under the existing [attention and scenes contract](attention-and-scenes-tech-design.md#5-perception-attention-interpretation-and-memory). A cliff is not required to win a subject slot. No native handler for a daughter, cliff, kitchen or anvil is introduced.
- Captured AI context remains immutable and private; later corrections, forgetting, grant changes and timeline replacement fence pending results. Late interpretations do not backdate actions or acquire unseen evidence.
- Relocating a character routes a pending valid decision to its current owner; it does not refresh the prompt, invalidate the character's identity or start another model call. The proof compares complete cognition requests, reference bindings, triggers and admitted responses.
- A reply's independent operations retain their individual outcomes. Refusing a replacement does not erase successful speech or stop prior work; previews create no actual effects, memories or random continuation.
- Native animal consumers remain distinct from human deliberation. More compute workers do not imply more model calls. Existing provider and spending admission stays outside simulation work.
- Ordinary progress remains accepted in memory and saved through the existing ordered writer. The current unsaved-window/crash and protected-operation guarantees remain in [save/load](../save-and-load.md#background-and-synchronous-world-saves); ordinary movement and same-process cell changes need no disk round trip. An actual cross-process custody transfer retains its explicit protected fence; its cost is part of distributed qualification.

Timing, memory and overload are preserved contracts, not additional feature redesigns here. The core must provide the ordering, captured cuts and bounded work needed to honor them. Detailed tuning and broader population/model-quality acceptance keep their existing owners.

## 5. Required journeys

| Journey                                      | Observable result and meaningful failure                                                                                                                                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Walk, turn, approach and stop                | The actor moves through real geometry; a nearby observer receives the actual selected samples in order. Route continuation does not create duplicate beginnings. Redirect/cancel preserves the actual partial outcome.          |
| First encounter and independent stale detail | Several people and animals enter view, including an unknown body. Broad context remains complete at its supported resolution; detail is selected by the installed policy. Later positional evidence does not renew lost detail. |
| Witness, speak and remember                  | Two observers receive different portions of a sequence and speech. Each player/NPC consumer sees only its own available chronology and retained knowledge. No raw-world reconstruction fills a gap.                             |
| Correction while work is pending             | Correct or forget a source after an AI/context/save preparation starts. Publication and later retrieval respect the current owner fences; an old worker response cannot restore deleted access.                                 |
| Save, stop and cold restore                  | Actual current-format PostgreSQL/checkpoint continuation restores positions, activity progress, identities, RNG, personal evidence and pending native work without replaying outcomes.                                          |
| Dense encounter and pursuit near a border    | The same supported interaction works at cell interiors, edges and corners. An animal/character is controlled once; attacks, hearing, collision and acquisition do not duplicate or disappear.                                   |
| Scattered players                            | Independent areas use available workers without cloning one whole world for every player. A slow optional task does not acquire global authority or block unrelated work.                                                       |
| Move out and back                            | Crossing nominal cells or reversing near an assignment boundary does not cause a transfer storm. A returned character resumes current state, never a stale former-machine copy.                                                 |
| Different authored reality                   | A supported nonhuman body/need and nonvisual channel use the same ownership, execution and received-evidence machinery. Base-world vocabulary, hunger, sight, species and action law are not required engine types.             |

## 6. First proof and staged capability

### First proof: a complete smaller pipeline

Implement **movement → perception → attention/history → permitted player/NPC consumption → saving and cold restoration**, using representative people, animals, geometry and interactions. It must use real semantic owners and the actual server/consumer/storage boundary. A fast position loop, synthetic map lookup, renderer-only demonstration or empty persistence adapter is not the proof.

Use a deliberately scoped world supported completely by both implementations. The same actors, actions, policies, input sequence and initial randomness must run in both. Unsupported features are refused at world installation, never silently routed back to a live TypeScript world. The [proof contract](native-simulation-core-tech-design.md#9-first-proof-and-complete-conversion) specifies included paths, comparisons and exclusions.

This proof establishes whether the proposed foundation reduces representative complete work, preserves meaning, fits the application boundary and scales useful independent computation. It **does not establish** full-game correctness, all action-family support, 500-player capacity, production failover or model quality. Those require later delivery and existing qualification.

### Subsequent gates

1. **Adopt or reject the foundation.** Compare integrated cost and semantics before expanding the port. Keep beneficial architectural findings if Rust does not justify adoption.
2. **Convert the supported game completely.** Move authoritative callers and current-format persistence together, retire replaced runtime paths, and qualify the actual standard opening and current native families. Do not advertise a miniature proof as the completed game.
3. **Qualify same-machine cells and border interactions.** Support independent jobs within a busy cell as well as multiple cells. No fixed CPU per geographic cell.
4. **Qualify controlled distributed execution.** Use the existing writer/control plane first; add compute machines, explicit custody and bounded interaction exchange only after single-machine results justify it. Start with a bounded coherent pause of the transferring scope while its active state moves; qualify live precopy only if that pause is a demonstrated problem. Required state loss retains whole-world recovery at the last complete durable cut, never an isolated regional rewind. This does not enable cross-world travel/federation or independently sharded databases.
5. **Qualify adaptive placement.** Reassign cell groups using sustained measured load/communication. Prefer reuse of existing boundary information and immutable terrain/definitions; do not keep complete synchronized former-owner copies.

Each stage has an independently reviewable outcome and stop condition in [NSC](../maintainers/native-simulation-core.md). The existing performance work owns detailed operating/capacity gates. Include dispersed players, a crowded scene and boundary interactions without adding a duplicate benchmark programme.

## 7. Capacity and economics

The budgeting scenario is 1,000 paying subscriptions at $15/month, approximately 500 simultaneous players, and potentially twice the current small scene's work per average occupied area. It is a planning scenario, not measured concurrency, an adopted subscription price, or proof that scene cost scales exactly linearly. The desired total service budget is about $3,000/month; $5,000 is a stretched ceiling in this discussion. AI, database, bandwidth, storage, operations and spare capacity must fit alongside simulation compute.

A server can contain many cores and processes. A measured opening consuming about one execution thread is not a measured per-player marginal cost, nor 96% of a whole multicore host. It also does not mean each player must fit into 0.1% of one core: that arithmetic assumes all 1,000 simultaneous workloads share one core. Conversely, 1,000 genuinely independent, equally expensive areas can approach 1,000 times the simulation work. Crowds add interaction and delivery fan-out even when they share geometry.

More RAM helps residency and avoids paging, not arbitrary CPU work. Faster cores improve work per core; more cores improve capacity only where work is actually independent. Hardware is not an exponential remedy. Around 50% sustained utilization is a provisional headroom planning example, not a universal cap or proof that the busiest worker has headroom. The [technical evidence/budget basis](native-simulation-core-tech-design.md#1-evidence-and-decision-basis) preserves the illustrative machine calculations and their limits.

## 8. Scope, decisions and acceptance

No new gameplay mechanic, fixed geographic barrier, loading screen, perfect cognition guarantee, population cap, global sight interval, full-history replica, autonomous life policy or broader physical sensing feature is selected. No backward-compatible save reader or permanent dual backend is required in this zero-user development stage. Current-format atomicity, permissions, privacy and protected spending remain mandatory.

**Required passes:** connected journeys for the delivered stage, exact once-only effects, current privacy and restored continuation, and the existing operating gates applicable to that stage. **Required measurements:** full process/core cost, allocation/retention, database/network amplification, latency and scaling with complete equal work. **Explorations:** speculative layout, library, worker and placement variants. A faster variant that loses required behavior fails. Human enjoyment, live model quality and production capacity remain separate evidence; do not infer them from deterministic fixtures.

Coverage includes the [current caller/field and lifecycle cases](native-simulation-core-tech-design.md#94-full-adoption-inventory-and-removal-targets), including unloaded history, unsaved reads, partial replies, live edits and restore-time authority. A successful fresh opening does not establish complete conversion. Ordinary queries see accepted state; loading cold records does not create memories, and restoring a save cannot restore forgotten information or renew expired control input.

**Open product decisions:** None needed to begin the scoped proof after implementation authorization. Rust-wide adoption, measured capacity, adaptive thresholds and distributed-family enablement are explicitly gated engineering decisions, not unanswered permission questions. The unrelated PS/D22 choices for federation, broader powers and product congestion limits remain with their existing owners.

## Maintained records

- Implementation and proof gates: [NSC00–NSC08](../maintainers/native-simulation-core.md).
- Mechanisms, caller conversion and research: [Technical design](native-simulation-core-tech-design.md).
- Limits and experiments: [NSC-L01–NSC-L09](../limits/native-simulation-core.md).
- Existing delivery/qualification: [PF10/PF11](../maintainers/performance.md#pf10--workers-and-movement-prediction), [BK29](../maintainers/production-data.md#bk29--pressure-and-preparation-work-removal-proposed), [PS06](../maintainers/product-scalability.md#ps06--capacity-and-sustainable-economics), [PD12](../maintainers/production-deployment.md#conditional-launch-and-expansion).
