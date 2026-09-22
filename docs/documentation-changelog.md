# Documentation changelog

This file records material changes to OpenLegend's documentation structure and historically important decisions that replaced earlier documented directions.

It is historical context only. Current requirements, design, architecture, tasks, status and open decisions live in their canonical owner documents.

## 2026-09-22 — Extensible-world foundation integration

Added engine/world principles, shared reusable-construct/effect contracts, world-agent authoring guidance, staged roadmap/examples and EWF ownership. AG/EPR/INV retain subsystem ownership. Corrected obsolete full-scan/history descriptions and old-save extension guidance while preserving current permissions, native phase order and acceptance states. Documentation integration itself changed no runtime behavior; subsequent implementation and evidence are recorded in Architecture and Verification.

## 2026-09-22 — Level-1 action selection

- Made Jev-only selection of a supplied native action explicit, alongside zero-call native continuation and generative immediate responses. Replaced mandatory routing-before-candidate ordering with the shared selection contract in the agency runtime; kept relevance filtering distinct from execution choice.
- Added pending CR02 implementation and CR12 fixture acceptance, linked AG01/AG07 integration, and documented the no-goal eating example. Runtime, implementation status and verification claims are unchanged.

## 2026-09-22 — Agency policy decisions and interruption

- Accepted general-knowledge speculation with profile, traits and backstory as initial behavioral guidance; retained acquisition provenance and native validation boundaries. D12 now retains only learning/sharing details.
- Resolved D54’s compulsory-thought question in favor of reconsideration opportunities and accepted D42’s NPC-disabled default with independent controls and qualified explicit enablement; numeric reminder tuning and remaining governance choices stay open.
- Clarified interruption of long-running work for changed needs, preservation of longer-term goals and native pause/cancel accounting; extended pending AG verification without claiming implementation or enabling runtime settings.

## 2026-09-22 — Agent agency documentation integration

- Integrated `docs/agent-agency.md`, `archive/07-technical-architecture/agent-agency-runtime.md`, `docs/maintainers/agent-agency.md` and `archive/02-research/agency-cognition-and-planning.md` from the review pinned to `c35f5fbb87ca10fcd941cfc3bb80d0011d0ef032`.
- Moved universal response and operational-goal semantics out of broader memory/conversation ownership, retaining response forwarding anchors and valid admission/experience requirements. Reconciled the newer EPR scope/intake contract instead of adding a second opportunity pipeline.
- Linked existing INV/CH work, narrowed NC13 to tested effect/privacy dependencies and INV-7’s existing-family loop to shared-service prerequisites, and removed obsolete development-save compatibility obligations while retaining same-version recovery and real accounting. Moved prior personal-perspective evidence to Verification and implementation facts to Architecture; D57 no longer treats response cardinality as unresolved. D12 retains conceptual-knowledge policy; D54 retains need/reminder tuning; R24 records agency experiments.
- Runtime behavior, deployment locks, spending policy and runtime verification status were unchanged. No implementation or acceptance checkbox was completed.

## 2026-09-21 — Proposed event framework integration

- Installed `archive/02-research/engine-perception-and-event-architectures.md`, `docs/events-perception-and-reactions.md` and `docs/maintainers/events-perception-and-reactions.md`, preserving the source audit at `03ae5fb7a5ac25bcda39e6dbde274be1c9a942bd`.
- Linked existing owners and trackers without completing implementation tasks; retained performance, cognition, sensory, narration, storage and save/load boundaries. Unresolved product policies remain in D53, D54 and D57.

## 2026-09-21 — Game menu and local save files

- Moved manual save/load controls from Settings & help to Game below World agent and moved manual slots to the gitignored local save folder. The pre-load recovery slot remains transactional in the authority database.
- Updated storage/backup guidance, runtime evidence and deferred validation; earlier database-only manual development slots are not migrated under the active no-legacy policy.

## 2026-09-21 — Development save/load implementation policy

- Recorded the owner's no-real-players block: no legacy readers, migrations or compatibility maintenance until explicitly lifted. Suspended SL06 and reconciled extension guidance.
- Recorded the initial manual-slot implementation, scoped native runtime evidence and deferred automated/adapter/provider qualification, without closing broader phase gates.

## 2026-09-21 — Save/load delivery tracker

- Added the focused SL00–SL10 tracker under `docs/maintainers`, separating reusable gameplay capabilities from evolving object schemas and production-data rollout.
- Linked the tracker from the maintainer index, design and production-data tracker; defined the initial manual-save slice and later autosave/conditional extensions without marking implementation complete.

## 2026-09-21 — Save/load design guidance

- Added `docs/save-and-load.md` as the canonical high-level gameplay restoration contract, with primary-source research and storage-independent state-design constraints.
- Linked relevant state, simulation, memory, identity, persistence and extension designs, and added an AGENTS.md requirement to consider save/load during substantial state/storage changes.
- Kept operational recovery and physical records with their existing owners; placed unresolved gameplay save policies in D60. No save/load implementation or acceptance task was completed by this documentation change.

## 2026-09-20 — Documentation consolidation

- Adopted one-canonical-owner documentation policy.
- Separated design specifications from implementation trackers.
- Moved NC00–NC13, ACT01–ACT06, INV-1–INV-8 and D0–D6 into focused maintainer trackers.
- Rebuilt the maintainer index as navigation and narrowed the general TODO to cross-cutting work.
- Recast implementation status and verification as current snapshots instead of completion diaries.
- Consolidated current runtime architecture in `docs/architecture.md` and removed the parallel technical system architecture and review/delivery plan.
- Removed the actor-model and narration source follow-ups after their current requirements were absorbed into the product baseline, canonical designs and trackers.
- Recorded the living-actor direction as accepted; only residual lifecycle/body semantics remain open.
- Retained Jev material only as provider research needed by current evaluation work; OpenLegend routing behavior belongs to the architecture and memory design.

## Living actor and history migration

Replaced current-state descriptions of split animal lifecycle and temporary pair-exchange context with schema 3 and durable conversation/history facts. Kept D56 unresolved, retained all ACT/D/NC task identities and open acceptance gates, and recorded deferred automated coverage in the maintainer TODO. Architecture remains the current-contract owner; specifications retain target behavior and focused trackers retain unfinished work.

## God revival and remaining program delivery

Resolved D56 in the canonical actor contract: full god revival reconstructs harvested bodies without removing collected inventory. Moved the accepted agent spending ceiling from D04 to the architecture; hosting costs remain unresolved. Updated current subsystem facts and preserved focused task IDs and open acceptance gates.

- Added the canonical identity/reference contract and linked the response specification to it. Updated architecture, implementation status and verification for saved control bindings and bound response IDs; deferred automated coverage is recorded in maintainer TODO.

## Runtime performance design

- 2026-09-21: Marked delivered performance implementation separately from open qualification. Added current cold-event, command-epoch, actor scheduling and index behavior to Architecture, recorded native runtime/restore/cadence observations and retained deferred coverage in TODO. Moved the accepted gameplay retry policy out of the open-decisions body to its real-time owner reference, and removed the stale seven-day command-horizon sentence. Multiplayer admission/replication, the unattended-world toggle and target-population verification remain excluded.

Added `docs/performance.md` for runtime scheduling and optimization, with ordered PF00–PF11 work and acceptance budgets in `docs/maintainers/performance.md`. The real-time specification retains protocol/prediction ownership, and production-data phases retain migration and scale rollout ownership. No runtime task was completed by this documentation change.

Moved five unchecked TODO items into the focused tracker: PostgreSQL measurement (PF00), diagnostics connection isolation (PF04), diagnostic batching/backpressure (PF06), and long-history/backlog work (PF08). Their open state and relevant conditions are preserved. The obsolete synchronous PostgreSQL worker and 16 MiB bridge-limit description was replaced with the current asynchronous single-connection architecture; this corrects implementation facts rather than declaring the measurement task complete.

Recorded the statement-count fixture and investigation limits in Verification, including the correction of an unverified remote-database explanation. Added D58/D59 for durability/storage-placement and retention/retry-policy choices. Reviewed the design for missed wakeups, privacy/recovery boundaries, unsafe multi-step batching, hidden database contention and unsupported speedup claims; the selected design preserves those boundaries and gates more complex mechanisms on measurements.

- 2026-09-20: Reconciled architecture, extension guidance, domain notes, performance guidance and implementation status for draft-proven event appends, routine milestone acceptance, actor-local Person pagination and importance-only retrieval invalidation. Recorded isolated runtime evidence and deferred regression/async-fixture work separately.
- 2026-09-21: Separated Person creation provenance from live Person editing. Documented description/personality/backstory/trait/goal ownership, how the first goal drives native planning, and which authored identity fields enter actor-private decision context.
- 2026-09-21: Added Person-editor survival-stat snapshots, explicit refresh and fill-to-100 behavior. Documented field-level save merging so untouched simulation drift is preserved and deliberate god-stat edits override the opened snapshot.
- 2026-09-21: Reconciled the cognition debugger contract around stable references, typed concise triggers, semantic stage names and root-only world-agent failure detail. Full sanitized stimuli remain restricted to owner raw inspection; automated coverage is explicitly deferred.
- 2026-09-21: Clarified trace versus stage identity, separated query-embedding diagnostics from ranked memory-context results, and restored response-linked accepted actions to durable person-scoped Talk history. Recorded the live retained-trace and owner-history observations without treating them as automated acceptance.

- 2026-09-21: Updated architecture, extension guidance and implementation status for the initial performance foundations. Preserved incomplete PF task exits, recorded native SQLite runtime observations separately from scale acceptance, and added deferred coverage to the maintainer TODO. No retention policy or multiplayer deployment claim was introduced.
- 2026-09-21: Accepted shared-world absence behavior: a world-level Continue while unattended setting permits progression with no present players; otherwise all admitted players must be disconnected or unfocused before the world pauses. Set ordinary gameplay commands to a 24-hour outcome-replay window followed by rejection through a server-issued command epoch/controller-generation watermark. Current receipts remain intact until that expiry boundary is implemented; provider, billing and administrative identities retain their separate policies.
