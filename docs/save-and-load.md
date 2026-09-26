# Saving and loading game state

## Current data foundation

Current gameplay authority is the independent record catalog described in [Architecture](architecture.md#state-and-transitions). Recovery assembles those records at a consistent revision; current feature queries do not read a world snapshot. Legacy snapshot/journal worlds migrate atomically in their original database after complete-value comparison. No new per-feature save marker or replacement directory is required.

Manual saves and portable backups capture native state, durable history, source-version history and optional source annotations. Restore installs these together, preserves present-day forgetting/accounting, and fences source/vector publication with a new generation. Dispatched indexing attempts remain outside gameplay rewind; compatible vectors may be reused, but old-generation completions cannot publish. The importer opens SQLite read-only, keeps an exclusive backup, verifies every copied auxiliary row and the reconstructed gameplay state, and refuses a nonempty PostgreSQL target. The current 64 MiB manual-save limit and synchronous serialization remain [SL/PF qualification work](maintainers/save-and-load.md); this foundation does not qualify a large-population save merely because record recovery succeeds.

## Spatial state

The [spatial persistence contract](../archive/07-technical-architecture/spatial-world-runtime.md#11-persistence-restoration-and-versioning) identifies canonical XYZ/support, accepted routes, native flight/fall and geometry/profile records; SDK objects, GPU resources and shape/graph caches are derived. Current-format restoration preserves native progress without regenerating AI decisions. Current-state validation includes the [status-effect registry](status-effects.md#admission-and-persistence), entity instances and their action/attribute ownership. Apply the in-place development policy below when these records change.

This document owns the high-level gameplay save/load design and the constraints it places on future state design. It specifies intended behavior, not implemented functionality or acceptance evidence. Object schemas, storage layouts, file formats, APIs and implementation tasks remain with their subsystem owners. Examples below illustrate categories; they are not an exhaustive save manifest.

[Architecture](architecture.md) owns current persistence behavior. The [production data model](../archive/07-technical-architecture/production-data-model.md) owns record and transaction contracts; [data delivery and scale](../archive/07-technical-architecture/data-delivery-and-scale.md) owns operational backup, disaster recovery and rollout. Those mechanisms must support this gameplay contract without becoming competing definitions of it.

Implementation is tracked in [SL00–SL10](maintainers/save-and-load.md), with an initial personal-world manual save/load slice followed by autosaves and conditional expansion.

## Current history capture boundary

Gameplay save capture reconstructs complete permitted actor memory, awareness and summaries from canonical records inside the consistent capture transaction. Simulation residency does not narrow the save. Restore compares against complete durable history before replacing the timeline, and shared restore enforcement preserves current forgetting/privacy restrictions and external accounting. Ordinary play releases cold sources again after durable publication. Capture still serializes in the main process with a 64 MiB guard; broader save-size and latency qualification remains in [SL](maintainers/save-and-load.md) and [PF08](maintainers/performance.md#pf08--long-lived-worlds-hot-state-and-checkpoints).

## Current subsystem integration

New durable state joins the existing `world-record-schema.ts` catalogue and `WorldRecords` projection/assembly, native candidate validation and `GameSaves` consistent capture/restore. The semantic owner supplies exact definition/reference dependencies and a safe in-place upgrade when needed. A component absent from the hot working set must declare completeness and materialize canonical rows before full capture or maintenance; an incomplete map is never permission to delete durable rows. No separate feature save version or reflection-based serializer is introduced.

| Foundation owner                | Captured authority                                                                                                        | Current authority / rebuild / stale work                                                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| State, claims and contributions | Native/sparse values, exact pins, active/terminal status records, holds, invocation progress and receipts                 | Rebuild availability/source indexes and materialize cold terminal records. Reconcile actual owners before resuming; cancellation releases unused occupancy without refunding stock.                         |
| Objects                         | Entity lots, one placement, containers, title declarations, retirements and occurrence-custody lineage                    | Rebuild parent/load/reference indexes, validate complete references/cycles and retain cold identities. Current access decides disclosure.                                                                   |
| Participation and accounts      | Rewindable actor participation and return anchor                                                                          | Sessions, grants, actor/account privacy ownership, control generations, operational exit attempts and audit remain current outside rewind. Reconcile the restored body against those records before resume. |
| Dependencies and work           | Required native root lineage, interval progress, latches and existing evidence cursors                                    | Rebuild derived tickets/indexes under a fresh generation; replace current host reservations once. Old callbacks/subscription acknowledgements cannot install.                                               |
| Appraisal/social continuity     | Stable appraisals, cause/policy pins, internal processes, accepted source versions and the existing subject-note revision | Materialize cold outcomes; preserve current erasure/forgetting and private ownership. Rebuild due indexes without reappraising history or replaying generation.                                             |

External provider attempts, spending/uncertainty and existing source-privacy overlays retain their current owners outside gameplay rewind. Validate new state through real downstream continuation and both supported SQL adapters, including failed publication, complete capture with cold records, restore and stale callbacks. [Foundation evidence](verification.md#foundation-priorities-15--implementation-evidence) records these integrations; SL's broader autosave, portability, crash and capacity gates remain separate.

## Active development policy

**Owner instruction:** evolve the existing database and world in place. Simple migrations, field backfills and direct schema/data updates are allowed and preferred. Preserve world identity, gameplay progress and unrelated records while moving to one current model. The restriction is against disproportionate effort supporting legacy game versions: no parallel legacy runtimes, speculative compatibility framework, per-feature world/save-version bumps or new-database/data-directory workflow.

Never automatically reset, regenerate or replace a world because a feature changed. A destructive reset requires an explicit owner request. If no safe, small conversion is clear, report the specific conflict and leave the stored state intact. Validate the converted candidate and publish it atomically through the existing persistence path; retries must not repeat effects. Journal integrity, privacy, accounting, credentials and other non-game authority remain protected. This policy supersedes older documentation that forbids migrations or treats saved gameplay as disposable.

## Purpose and recovery promises

A player should be able to retain a world at a committed point, leave it, and continue from that point later. Loading a pre-death save restores the coherent world from before the death, including its other consequences; selectively reviving a character is a separate gameplay operation.

Keep four capabilities distinct:

| Capability         | Promise                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Crash recovery     | Recover the latest durable committed state under the published durability policy.                                                                             |
| Gameplay save      | Retain an identified point that remains loadable independently of later world progress. Manual saves and rolling autosaves use the same correctness contract. |
| Operational backup | Recover storage and control records after infrastructure failure under the operations policy.                                                                 |
| Replay             | Reconstruct a sequence from retained inputs/outcomes under compatible rules; not a prerequisite for loading a save.                                           |

A compacted recovery journal alone does not provide historical saves. “Ten minutes ago” is recoverable only to a retained point, unless a separate verified point-in-time reconstruction capability exists. Show both real creation time and simulated time so accelerated or paused play is unambiguous. A save is successful only once it is durably published, not when its request is queued.

## Research and design basis

These primary sources describe useful, established patterns, not a universal implementation or a ranking of games:

- **Continuity:** Wube describes Factorio's requirement that save/exit/load preserve observable behavior when external conditions are unchanged, and the difficulties introduced by content changes and reference ordering. OpenLegend adopts that continuity goal for native simulation under compatible rules. [Factorio save/load overview](https://www.factorio.com/blog/post/fff-270).
- **Explicit scope and asynchronous writes:** Epic supports custom save objects, multiple slots and separation of global progression from a playthrough; it recommends asynchronous saving to avoid frame hitches. OpenLegend similarly defines save scope explicitly and separates consistent capture from potentially slow output. [Unreal Engine saving and loading](https://dev.epicgames.com/documentation/en-us/unreal-engine/saving-and-loading-your-game-in-unreal-engine).
- **Deliberate reconstruction:** Godot's tutorial selects persistent data explicitly and explains why nested saved objects require staged reconstruction and renewed references. Its example is introductory, not a complete transactional loader. OpenLegend therefore treats graph restoration and validation as an explicit phase. [Godot saving games](https://docs.godotengine.org/en/stable/tutorials/io/saving_games.html).
- **Versioned evolution:** Factorio tracks applied migrations in each save and orders their execution. OpenLegend needs explicit compatibility and migration history, without adopting Factorio's scripting mechanism. [Factorio migrations](https://lua-api.factorio.com/latest/auxiliary/migrations.html).
- **Consistent storage capture:** SQLite provides a dedicated online backup mechanism with incremental copying and bounded lock periods. Copying live files is not a general substitute for a storage-supported snapshot. A database snapshot also cannot by itself define which game or external records should rewind. [SQLite backup API](https://sqlite.org/backup.html).

The requirements below are OpenLegend's synthesis of those lessons and its existing authority, privacy and paid-work boundaries. They do not require an engine change or a new serialization dependency.

## State ownership and save scope

A world-module manifest and the exact definitions/host interfaces needed to interpret its state are part of save completeness. Derived registration bindings may be reconstructed, but missing required mechanics cannot be replaced silently or regenerated by a model. Shared module responsibilities are specified in [World-module runtime](../archive/07-technical-architecture/world-module-runtime.md#11-save-restore-and-storage-extension).

For proposed [EPR state](events-perception-and-reactions.md#11-saveload-reset-and-privacy), spatial bins can be rebuilt when reconstruction preserves behavior. Threshold latches, encounter episodes and due intent must be saved or deterministically reconstructed whenever they affect the next response. The active in-place development policy and generation fencing remain governed here.

Every subsystem must identify its authoritative facts and how they participate in a save. Storage location does not determine whether data matters: cold history, unloaded regions and accepted character files can be essential even when absent from the active simulation object.

| State category                  | Save/load treatment                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authoritative world timeline    | Preserve the facts necessary to continue that world, including consequential history and in-progress native work.                                                         |
| Referenced rules and content    | Preserve or pin the exact compatible versions needed to interpret those facts, including admitted generated definitions.                                                  |
| Derived state                   | Rebuild from authoritative facts when rebuilding preserves behavior. Spatial indexes, display caches and search projections are candidates, not automatically disposable. |
| External authority              | Reconcile against current accounting, permissions, privacy protections and external operation records; gameplay rewind cannot roll them back.                             |
| Process resources               | Recreate connections, timers and execution handles. Persist logical intent/status where needed, not live runtime objects.                                                 |
| Player presentation preferences | Keep independently scoped unless a setting actually determines world behavior. A preference's storage location does not make it simulation state.                         |

A supposedly derived value that affects the next simulation choice must either be reproducible under the same rules or become saved authority. Rebuilding an index must not silently change tie-breaking, reroll traits or manufacture knowledge. Existing memory and privacy rules remain owned by [Memory architecture](memory-architecture.md).

For each new or substantially changed state concept, its owning design should answer: who owns it; what durable facts reproduce it; which stable references and content versions it depends on; where its committed boundary lies; what is rebuilt; how it migrates; and how deletion, retention or external effects constrain restoration. Answer these briefly where the concept is defined, rather than building a second inventory here or introducing a generic plugin framework.

## Continuation and identity

Keep relationships independent of display names, memory addresses, UI trees and incidental database row order. The [identity contract](identity-and-references.md) remains authoritative. Reconstruct identities before resolving relationships, including cycles; distinguish legitimately absent references from corrupt required ones.

Save enough simulation context to resume partial work and preserve ordering, randomness and deadlines. Simulation time belongs to the world; real-time billing and external timeouts do not. Loading does not authorize offline catch-up. Future region dormancy or analytic simulation must define how their saved boundaries preserve the agreed simulation semantics.

With identical native rules and subsequent inputs, save/load should not alter native outcomes. This is semantic equivalence, not byte-for-byte equality of caches or newly issued session tokens. Version migrations and current privacy restrictions are explicit transformations. Future model responses are not promised to reproduce: retain accepted generated outcomes rather than re-running prompts to reconstruct the past.

## Capturing and publishing a save

Capture at a complete authoritative transition boundary. An explicit save must establish a committed cut, including pending native progress intended to precede it. A transition is entirely before or after that cut; its world effects, required history and accepted durable side effects cannot straddle it. Do not wait indefinitely for external generation: classify unfinished work under the external-work rules below.

Treat the save as one logical root identifying a revision and its complete dependency closure. It may physically use one file, several blobs, database rows or a snapshot plus bounded committed changes. All parts must describe the same cut. Independent reads of “latest” rows across stores are insufficient. Use a consistent read view, immutable version references or an equivalent coordinated boundary, and fail capture if completeness cannot be established.

After capture, serialize and write from stable data. Background serialization of a mutable live object is not a consistent snapshot. Bound the capture pause, retained snapshot memory and concurrent saves; prefer the simplest measured solution over unconditional full copying or new coordination infrastructure.

Write a candidate without destroying the last good save. Validate completeness and integrity, then publish it atomically using the chosen storage system's durability guarantees. An interrupted write must leave either the previous complete save or the new complete save discoverable, never a partial replacement. A checksum detects accidental corruption; it does not establish trust. Concurrent completion must not let an older capture replace a newer slot revision accidentally. Return useful failures for full storage, missing dependencies or failed publication.

## Loading as an authority transition

Loading replaces a coherent world timeline through one authoritative operation:

1. Check authorization and compatibility; read and validate a candidate in isolation. Bound input sizes and decompression, reject unsafe paths or executable payloads, and verify required dependencies. A save is data, including generated content.
2. Apply supported migrations to the candidate, retaining the source. Restore identities and relationships, validate domain invariants, and prepare required derived state without emitting gameplay events or performing paid work.
3. Quiesce world admission, establish a recoverable pre-load point, and recheck mutable permissions, privacy restrictions and external ledgers at installation. Fence outstanding work and requests using a fresh authority generation.
4. Install the world and its required projections atomically, or by an equivalent recoverable generation switch. A crash must recover one complete authority generation. Failed preparation leaves the active world untouched; failed installation must never expose a mixture.
5. Rebuild remaining safe caches, issue fresh client baselines, invalidate old cursors/selections and resume paused. Advancing again is an explicit player action.

These are responsibilities, not prescribed services or APIs. An initial loader may stop the world during preparation. A later loader can prepare off the critical path if it revalidates the installation boundary. Restoration must not call ordinary creation hooks that allocate replacement identities, award items, schedule duplicate effects or consume fresh randomness.

Give the load operation a durable identity outside the rewindable timeline. Retrying a request after a lost response must return its recorded outcome, rather than loading the checkpoint again after the world has advanced. A deliberately requested new load remains a separate operation.

The abandoned future must not remain visible as current world history, actor knowledge, conversation context or accepted workspace content. Retained audit data is separately scoped and cannot feed restored cognition accidentally. Privacy overlays may remove access to older evidence even when the checkpoint contains it.

Independent database records do not change this requirement. Capture and restore unloaded regions, cold memory/evidence, definitions and pending native work with the same coherent cut as active entities. The current timeline/writer fence is installed outside the rewindable payload; old jobs, cursors, vectors and callbacks must validate it even when restored source IDs/revisions happen to match. The [production model](../archive/07-technical-architecture/production-data-model.md#timeline-and-authority-fencing) owns those storage references.

## External work, privacy and shared authority

The world creator and authorized OpenLegend system administrators may save and load that world through the game service. Ordinary participants have no world-rewind permission. Validate the principal and world scope on both request and installation, and record the administrative operation. This permission does not grant inspection of human-private content or authority to rewind external accounting. Shared restoration uses a coordinated complete world cut; it cannot roll back one player's side of a shared trade alone.

Loading never refunds actual spending, erases uncertain paid attempts, reverses a provider call or restores revoked access. Current forgetting/erasure protections remain effective across older saves and their derived projections. The detailed policies belong to memory, billing and operations owners; save retention and export must respect them. Saves containing private minds and history require private access and must exclude credentials.

The shared restore commit reapplies the complete current forgetting ledger to installed transcript audiences, perspectives and dependent stories. Comparing only against the abandoned world's ledger is insufficient: an older backup may restore permissions for evidence that was already forgotten in that world. This enforcement covers both gameplay loads and the operational restore command.

Saved work intent and an external execution are different things. Work already committed before the cut restores its accepted result. In-flight work from the abandoned generation cannot publish into the restored world, even if IDs recur or cancellation fails. Work known never to have been dispatched may be reconsidered through normal admission after resume; uncertain completion stays uncertain and must not trigger an automatic paid retry. Restoring an accepted character workspace does not restore a live provider session or authorize continuing its abandoned context.

An operational recovery onto a fresh host must recover or reconcile the non-rewindable authority as well. If that authority is missing, block affected external dispatch rather than assuming no spending or revocation occurred. Copying an old whole database over a live account is not a gameplay-load implementation.

The unit of rewind is the world or another explicitly defined, dependency-closed authority boundary. A future shared world cannot rewind one player's possessions while leaving the corresponding shared trades intact. Cross-world transfers and irreversible external effects require explicit reconciliation or branch isolation; distributed transactions are not required before those features exist. A new generation distinguishes old commands and callbacks even if in-world identifiers remain stable.

Creator restore/export permission does not grant access to human-private messages or private character notes. Shared-world save tools must preserve these through authorized protected storage or explicitly exclude non-rewindable private-channel data under its chosen policy, without leaking plaintext through game interfaces. Direct database/host administrators are outside this game-level privacy guarantee. Private-channel timeline treatment and participant synchronization remain D48/D60 feature decisions; save/load roles are settled. Do not silently omit gameplay-critical private state or claim a complete save when it is missing.

## Compatibility and retention

Version save interpretation separately from mutable display names and physical storage layout. Identify required rules/content versions and the supported reader/migration range. Unknown required mechanics, missing dependencies and unsupported versions must produce a clear refusal, not silent deletion or regeneration. Cosmetic substitution is permissible only when it cannot change semantics and is disclosed where relevant.

Development migrations must be small, restart-safe and validated before atomic publication; checking the current shape is sufficient when it makes conversion idempotent. Convert relationships and behavior as well as renamed fields. A future supported release may need an ordered migration pipeline and declared support window; neither indefinite support for development formats nor that infrastructure is required now.

Retained saves pin their necessary content, history and incremental bases. Garbage collection, history compaction and definition cleanup must account for those references. A save depending on mutable “latest” content or already-deleted journal entries is not retained successfully. Explicit privacy deletion overrides ordinary retention through the privacy policy, including handling affected backups.

Use bounded rolling autosaves and separately retained manual saves when the feature is implemented. Autosave rotation must not evict a manual save implicitly or delete the last valid checkpoint before publishing its replacement. Engineering selects reasonable cadence/recovery defaults and records retention choices under the [retention ledger](../archive/07-technical-architecture/data-delivery-and-scale.md#retention-decision-ledger). [D60](../archive/05-project/open-decisions.md#d60--gameplay-save-and-load-policy) retains conditional compatibility, notification and cloud conflict choices; save/load authorization is fixed above. Do not merge divergent simulations silently.

## Performance and evidence

Follow the [performance design](performance.md). Measure capture pause, peak memory, bytes written, background work interference, durable-save latency and time until a restored world is playable at representative population/history sizes. Moving serialization off-thread does not remove consistency or memory costs. A bounded hot working set does not justify dropping cold authoritative data from a save.

Begin with the existing persistence capabilities and the simplest complete snapshot representation that meets measured needs. Incremental saves, deduplication, compression or streaming are options, not prerequisites. If incremental chains are used, bound reconstruction work and protect every required base until replacement is durable. Save-frequency tuning must not silently weaken acknowledged-command durability.

Verification should demonstrate native continuation across partial work, death, random choices and simulation deadlines; complete restoration of cold and cross-store dependencies; safe handling of cycles and missing references; and migration of supported historical fixtures. Failure injection must cover interrupted publication/installation, corrupt or oversized input, missing content, exhausted storage and repeated load requests. External-work scenarios must prove that stale callbacks, uncertain attempts and old browser commands cannot create duplicate effects or spending, and that current privacy restrictions survive rewind.

These are save/load acceptance principles, not completed tests or an implementation checklist. Concrete delivery tasks belong in focused maintainer trackers, and observed results in [Verification](verification.md).

### Reusable index artifacts

Operational backups also preserve revision-keyed vector cache records, including during a PostgreSQL-to-SQLite portable restore and later PostgreSQL import. The cache is outside gameplay rewind and outside ordinary recall. Only an eligible exact current source can republish a cached vector under the current generation; late old-generation results remain fenced. This is a derived-data reuse policy, not a new memory-retention or privacy policy.
