# Shared state, effect contributions and resource claims — feature specification

**Status:** proposed implementation scope; no runtime changes are delivered by this document. Priority 1 in [remaining foundational work](../maintainers/remaining-foundational-work.md). [Technical design](shared-state-contributions-tech-design.md) owns mechanisms; [SC01–SC08](../maintainers/state-contributions.md) decomposes existing EWF02–03 and INV-6.3 work. [Package scope and research baseline](foundations-1-5.md) applies.

## 1. Outcome

Independent supported mechanics must interact without overwriting one another, duplicating a finite resource, or undoing unrelated history when an effect ends. A player, native animal, cognitive actor and creator use the same semantic state owners. A newly supported world rule should not require another writable health/energy copy or a name-specific branch in every UI and prompt.

This is a shared execution foundation, not a universal physics engine. The engine protects valid ownership, accounting, authorization and bounded execution. The world decides whether a resource is conserved, replenishes naturally or has an authorized fictional source. Similar names or units do not make resources interchangeable.

## 2. Inherited decisions and actual starting point

[Engine/world boundaries](../engine-and-world-boundaries.md), [world-module runtime](../../archive/07-technical-architecture/world-module-runtime.md#5-effects-ownership-and-deterministic-composition), [declarations](../../archive/07-technical-architecture/declarations-and-evolution.md) and [save/load](../save-and-load.md) remain authoritative. Existing native ordering and saved randomness must be preserved while adapters are extracted. Broader start-of-phase composition is introduced explicitly, not retroactively attributed to the current tick.

At main `c70f4c1e932fb9bf0fdcc61efe30ccd1bdb64041`, `world-modules.ts` already defines finite attribute implementations, pins and scoped views; `worlds/base/needs.ts` centralizes fullness/energy setters but still applies native starvation/exhaustion health changes directly. The charge demo already has a finite source and native replenishment. These are valuable consumers, not a complete shared arbitration protocol. The invention continuation inspected at `271ac5738a1afe5dca0f53b2dc1a89a5e7c11b93` supplies existing admission/draft/receipt work that must be reused through DF02 rather than recreated.

## 3. Player and actor journeys

### A. Two actors need the last charge

Two compatible actors start replenishing from the same finite source. Each sees only its permitted current source/need information. Admission may succeed for both ongoing activities, but each native transfer claims actual available supply at its execution boundary. The same last unit cannot satisfy both.

The successful recipient receives exactly the admitted amount; the other stops or receives the declared bounded partial amount and a truthful depletion result. Neither a stale menu nor a retry creates charge. Cancellation releases unused reservations but does not return charge already consumed. Saved progress and remaining supply resume coherently after restart.

### B. Hunger, damage and healing share a body

A wilderness actor experiences native need depletion and a supported bodily effect. All consumers read the same authoritative values. Extracting the owner must preserve the current wilderness trace: its distinct eating, seeking, exhaustion, recovery and cognition thresholds do not collapse into a generic meter threshold.

When a temporary condition ends, the game removes its remaining modifier or capability block. It does not restore an old whole-body snapshot and erase subsequent healing or damage. A completed health change is history; it is not an active reversible modifier.

### C. Two independently caused capability blocks

An actor is affected by two supported conditions that block the same capability. Ending one condition leaves the other in force. The state view explains the permitted active causes without treating the two conditions as one disposable Boolean. Ending both restores the capability only if the current body and other rules allow it.

This is the deliberately unlike consumer: a capability predicate combines active contributors, whereas a reservoir transfers finite stock. They share admission, identity, lifecycle and change metadata, not a fake universal addition formula.

### D. A creator adds a supported reserve

Through the existing workshop, an authorized creator describes a reserve and selects supported replenishment/termination behavior. The system exposes units, applicability, precision, source requirements, limits and unsupported capabilities. The same versioned candidate drives the explanation and activation. A creator cannot turn an arbitrary field name into execution or grant spending by declaring a resource source.

Supported artifacts become inspectable through the current attribute/action surfaces. A new label alone is not completion. Ordinary players and NPCs may use admitted mechanics without receiving permission to define them.

## 4. Required behavior

### State meanings and ownership

Every state address resolves to one registered semantic owner. Known zero, unknown, absent/not initialized, not applicable and unsupported are distinguishable outcomes. An absent human need on a machine must not appear as starvation or a fake empty bar. Definitions specify units/precision, bounds, initialization and disclosure; state instances carry revisions and provenance.

An editor, native step and admitted extension submit supported operations to that owner. The client or model cannot select an arbitrary JSON path. Creation and edits use existing grants, expected revisions and current timeline bindings.

### Contributions versus committed transactions

The user-visible distinction is explicit:

| Form | Meaning when its source ends |
| --- | --- |
| Committed change or transfer | The change already happened; source removal does not undo it. |
| Active modifier/capability contribution | Remove only this source's remaining contribution and recompute from current base state and remaining contributors. |
| Ongoing process | Stop future work according to its interruption policy; retain completed work and receipts. |
| Unspent reservation | Release the reservation through its owner; do not add the amount to stock a second time. |

Stacking, refresh and replacement are declared family policies. Repeating the same invocation cannot create a second contribution. A new invocation cannot remove another source merely by choosing its display name or stacking key.

### Competition and failure

An atomic action either acquires all required claims and applies its coupled effects or changes nothing. Partial transfer is allowed only where the family advertises it, such as replenishing until source depletion or recipient capacity. Result messages identify actual fulfillment rather than reporting the requested amount as success.

Failures distinguish stale state, insufficient available resource, incompatible semantic resource/unit, unsupported operation, missing capability, forbidden authority and unavailable execution. Actor-visible messages cannot reveal hidden target identities, private causes or another actor's reserved plans.

A real-world timeout is not an instruction to run the transaction again. The caller resolves the existing receipt or reports uncertainty. Provider outages cannot stop admitted native reserve drain or remove an active condition.

### Time and lifecycle

Instant changes need no invented timer. The first release supports the lifetimes required by current status and replenishment consumers: instant, fixed simulation-time deadline, source-sustained and explicit removal. Conditional termination may use a supported native predicate only when its dependencies and bounded review are implemented; arbitrary prose predicates remain unsupported.

Pause does not consume simulated time. Restart does not add unrequested offline catch-up. Load fences prior callbacks and restores complete contribution/process state under fresh authority. Removing a source, target or definition produces a supported detach/stop outcome or rejects retirement; it cannot leave a hidden running effect or a second writer.

## 5. Scope and staged experience

**Stage 1:** wrap current numeric/categorical/native state providers and route affected native writers through their owners without changing their gameplay outcomes. Expose precise errors and retain current views.

**Stage 2:** implement claim/transfer accounting through charge replenishment and a consumed native resource path. Exercise contention, partial fulfillment, cancellation and recovery. Inventory callers initially use their current custody representation through an adapter; Priority 3 later changes identity/storage, not resource semantics.

**Stage 3:** make active capability contributions independently removable and integrate selected stock effects through the same admission/change envelope. Demonstrate overlapping causes and permanent-versus-active distinctions.

**Stage 4:** bind the supported interfaces into existing invention discovery, safe inspection and owner editing, then qualify the combined native flows. No new chat, generic compiler or module installer is included.

## 6. Non-goals and extension seams

No unrestricted formula language, simultaneous whole-world solver, arbitrary generated code, complete anatomy system, compulsory emotion meter, distributed transaction coordinator or general resource marketplace. The full modular shelter/rain/combustion example remains INV-6.4. This project supplies its prerequisites, not a claim that those mechanics now exist.

The v1 aggregation catalogue is intentionally small: owner-validated stock operations and existing capability/status aggregation. A genuinely different algebra requires a reviewed family, its units/ordering proof and a real consumer. Preserve the external-world-package seam without building a loader.

## 7. Acceptance

The project is complete only when the linked SC work proves: one authoritative value through native/editor/context/UI/storage paths; unchanged baseline wilderness order; finite resource contention without duplication; opposite consumer semantics for stock and capability contributions; exact duplicate handling; unrelated-state preservation on cancellation; coherent save/restart/restore and definition retirement; scoped explanations; and bounded native work with zero required provider calls.

Required scenarios include two replenishing actors, empty source, full receiver, compatible partial transfer, incompatible unit with the same label, overlapping capability blocks, healing after an effect starts, repeated cancellation, source removal, stale work after restore, and a machine without human needs. An interface declaration, custom meter or isolated microbenchmark does not satisfy this gate. Native, browser and database evidence must be recorded separately under SC08; broader PF/D5 and live-authoring quality remain open.

## 8. Decisions and open questions

Proposed engineering defaults are explicit in the technical design: deterministic admission order within named phases; atomic claims unless the family declares partial fulfillment; no snapshot rollback for effect removal; new conserved quantities use declared quanta; current native numeric behavior is preserved during extraction. These implement existing direction without choosing new world balance.

**Blocking product questions: none identified for this scope.** A genuinely lossy populated-state conversion, unsupported lifecycle transition or new world law discovered during implementation must be surfaced before applying it. This document does not authorize that loss or new mechanic.
