# World constitution and mechanic stability

**Status: accepted target design.** This document owns the resolved world-governance view, mechanic freeze and author refinement policies, and their relationship to immutable artifacts, installation pins, and runtime quarantine. It extends the existing [governance](../archive/03-design-proposals/invention-governance-and-ownership.md) and [module runtime](../archive/07-technical-architecture/world-module-runtime.md); it does not introduce a second kernel, definition registry, permission service, or wallet. Delivery belongs in [INV](maintainers/inventions-and-world-evolution.md).

## 1. What the constitution is

A world constitution is the versioned, inspectable answer to: what kind of reality is this world, which definitions and policies govern it, what ordinary invention may add, what is protected from revision, and what computational obligations must hold?

It is a resolved view over authoritative references, not a large prompt and not a duplicate mutable copy of the world manifest. Initially implement it with existing world records and small added policy records. Its digest identifies the relevant governing inputs for validation and activation.

The resolved view includes:

| Input | Meaning and authority |
| --- | --- |
| World identity and current authority generation | Which timeline/installation a consequential operation can affect. |
| World profile and premise policies | Permitted fictional domains, declared defaults/unknown handling, and rules for ordinary discovery versus explicit law correction. |
| Installed module/definition manifest | Exact admitted versions, selected owner/service bindings, and supported interfaces. |
| Invention policy | Existing independent player/NPC origin locks and revocation watermarks. |
| Mechanic protection records | Owner review requirements, frozen installation/behavior scopes, and author-controlled refinement restrictions. |
| Validation policy references | World-specific obligations and admissible approximations, beneath non-removable host checks. |
| Computational policy references | Hard runtime ceilings, world allocations, and allowed runtime semantic work. |
| Separate authority references | Current account/principal grants, rights, external privacy/revocation controls, and funding scopes; references do not grant access. |

Do not embed credentials, account balances, raw private memories, or complete billing history in this view or in an NPC context. Produce a scoped explanation for each audience. A creator can inspect authorized governance; an actor receives only the permitted implications for its request.

## 2. What may and may not be invented

The existing [engine/world boundary](engine-and-world-boundaries.md) remains the authority. Its four layers distinguish protected integrity, reusable runtime services, default world behavior, and admitted extensions. `Combustibility`, `gravity`, `reputation`, `disease`, `mana`, and `metabolism` are not privileged simply because they sound fundamental.

A world may author a combustion approximation using supported state, conditions, sources, contributions, queries, and lifecycle operations. It may instead install a fantasy rule with explicitly authorized creation. Neither path can invent a new host privilege, bypass a state owner, erase real charges, read ungranted private records, or execute arbitrary code.

Similarly, conservation of ordinary physical energy is a possible world law. Truthful resource identity, authorized source/sink semantics, complete receipts, and bounded host work remain runtime obligations. A fictional rewind cannot rewind external accounting or current security revocation.

A mechanic's validation rules may be authored too. A new law must identify its applicability, assumptions, obligations, and expected behavior through admitted test/predicate interfaces. It cannot exempt itself from higher-level rules or certify its own correctness merely by supplying tests that pass. The [validation hierarchy](invention-validation.md#3-who-defines-validity) defines this boundary.

A supported native implementation can be replaceable world behavior. A missing execution primitive remains a G3 engineering requirement, or a future G2 candidate only within a separately qualified interface. Registering a field called `combustibility` is not a combustion implementation.

## 3. Constitutional changes use existing authority

A new constitution revision is evaluated under the currently active authority and governing policy. A candidate cannot simultaneously grant its author permission, remove a constraint, and cite the weaker proposed policy as its admission authority.

An authorized creator may request a world-premise or policy revision through the workshop. Present the old/new governing inputs, protected scopes affected, dependent systems, compatibility and initialization consequences, and funding implications. Use the existing declaration/activation boundary for definition changes and the appropriate policy mutation boundary for administrative controls.

The proposed revision can be used in isolated evaluation, but it is not live until authorized publication commits. Recheck the base constitution/manifest and relevant grants. Where a change requires multiple artifacts or owner bindings, publish the coherent bundle atomically rather than exposing partially changed laws.

Do not classify every constitution change as the same operation. Tightening an origin lock is administration; replacing a thermal law changes world behavior; raising a spending limit requires payer authority. A world-owner title does not automatically grant authority over another payer's budget or a third party's licensed artifact.

Ordinary invention discovers or composes behavior compatible with the governing world. Explicit creator correction can change a law with declared initialization/migration. Neither should fabricate historical observations or silently reinterpret incompatible recorded outcomes as if the new rule had always been implemented.

## 4. Stability is several independent controls

Do not use one `locked` flag or make `frozen`, `active`, and `quarantined` mutually exclusive statuses. A frozen definition can still be active or quarantined. A deprecated version may remain necessary to a retained object/save.

| Control | What it prevents | What it does not prevent |
| --- | --- | --- |
| Immutable admitted artifact | Editing the bytes or meaning of that exact version in place. This is universal. | A permitted new revision or independent fork. |
| Exact installation pin | Implicit adoption of a newer dependency or implementation. No `latest` resolution during play. | Explicit compatible activation under current policy. |
| World-owner review policy | Automatic activation of consequential revisions in the protected scope. | Drafting or ordinary use when otherwise permitted. |
| World-owner freeze | Replacing/removing/rebinding the protected installed semantics without an explicit owner-authorized unfreeze/change operation. | Compatible ordinary use, learning, or composition within the existing contract. |
| Author refinement lock | Unsolicited redesign or automatic replacement of the author's chosen candidate/appearance in the protected lineage/project. | Separately permitted forks, owner runtime quarantine, or mandatory technical validation. |
| Origin invention lock | New/revised definition admission by the selected player or NPC origin under existing governance. | Existing actions, learning, physical instances, native survival, or faithful visualization of admitted behavior. |
| Runtime quarantine | Further unsafe execution/publication in its declared affected scope. | Keeping history, inspecting evidence, drafting a repair, or retaining referenced artifacts. |

New admitted versions are immutable regardless of whether an author clicks Lock. A lock protects change policy, not mutable bytes that would otherwise be editable.

### 4.1 Who can control what

Protected platform integrity can change only through reviewed engine operation/release, never through a world command. A world owner or explicitly delegated administrator controls world freezes and review rules within that world. An authorized author controls automatic refinement of their contribution/project, subject to actual collaborative grants. Other users may request revisions or create permitted forks, not assume the authority to alter another world's installation.

Emergency quarantine belongs to the host/operator or an explicitly granted runtime safety operation. It may stop frozen behavior to protect integrity, but cannot silently replace its meaning or erase history. Removing quarantine requires the declared recovery/repair checks and authority, not merely unfreezing the artifact.

Existing player/NPC origin defaults remain unchanged. An NPC cannot grant itself a new lock exception. Player-delegated model/NPC work retains player origin. The current proposed owner exception for authoring while player invention is locked is not implicitly adopted here: follow existing governance until that separate permission is explicitly selected and implemented. Administrative control of a lock is distinct from permission to author while it is set.

### 4.2 Freeze scope and user commands

A command such as `lock fire` must resolve to actual IDs, installed versions, protected bindings, and a clear scope. If several fire-related mechanics exist, ask a meaningful disambiguation question or show a precise proposed selection. A display name or semantic match alone is not a lock target.

The confirmation explains whether the operation protects one draft, one chosen appearance, an invention lineage, a world installation, selected world-law interfaces, or a dependency-closed bundle. Record the principal, reason, expected policy revision, effective boundary, and operation receipt.

Freezing a mechanic does not freeze its live state. Fuel can burn, a basket can break, and a character can learn a frozen method. The lock concerns the rule or representation change, not ordinary execution of that rule.

The default world freeze is reversible only through an explicit authorized unfreeze/change workflow with an audit record and fresh checks. Do not advertise cryptographic or irrevocable permanence in a self-hostable engine. A stricter sealed-world policy would need a separate explicit product decision; no hidden emergency rewrite bypass is implied by ordinary freeze.

### 4.3 Automatic freeze policy

A world may configure a deterministic freeze trigger, such as after first accepted use or explicit release. The trigger, scope, actor authority, and consequence must be visible before it takes effect. Merely finishing an image job or receiving a model answer cannot implicitly lock behavior.

A trigger observes committed domain/release facts, uses an idempotent policy transition, and participates in save/current-authority handling. It does not need a model to decide each tick whether a mechanic feels established. Manual freezing can ship first; trigger automation is optional implementation work, not an unbounded background evaluator.

## 5. Preventing indirect freeze bypass

Protecting one artifact's bytes is not enough. A replacement source, owner binding, alias, adapter, parameter dependency, or consuming process may change effective behavior while leaving that artifact untouched.

A freeze record therefore identifies the installed target and the semantic interfaces/bindings or dependency closure it protects. The validation planner checks both direct changes and new incoming interactions that can affect the protected scope. A new version under another name cannot bypass an explicit protected binding or world premise.

Do not prohibit all extensions that mention a frozen law. A torch can use frozen combustion through its admitted contract. A new authoritative heat writer that bypasses the frozen thermal owner cannot. A legitimate repair mechanic can coexist when its resource sources and effects satisfy the applicable rules; do not label every useful cycle an exploit independently of the world's premise.

Separate `compatible use` from `redefinition`, `replacement`, `override`, `new interaction`, and `unresolved compatibility`. Typed read/effect/owner/query contracts provide mandatory detection; semantic review can raise additional concerns but cannot prove that a freeform promise such as `nothing will ever change fire` is exhaustively enforced.

If the requested protection is broader than the supported contracts can establish, narrow the proposed lock visibly or require review of affected additions. Do not claim to freeze every emergent consequence of arbitrary future mechanics. Protect explicit semantics and declared invariants, with honest limitations.

## 6. Pins, variants, and shared laws

The dependency graph records the appropriate binding phase: authoring, installation, invocation, or a separately admitted runtime update. Avoid one generic `dynamically resolved` escape hatch.

A blueprint revision can apply to future construction while existing objects retain their original construction identity. Modifying an existing object is an actual action or authorized migration. A shared-law revision must apply coherently to equivalent objects within its causally defined scope, not give one player different physics because of a release cohort.

Runtime choices can select among an already admitted finite set under an explicit contract. They cannot fetch `latest`, switch owner interfaces, or import new privileges implicitly. A world-style revision can rebind compatible art independently; an author's selected appearance remains protected where a refinement lock applies.

Pin dependency closure for installed worlds, exported releases, and retained saves. Forking a world or importing a pack creates a new authorized installation decision; it does not secretly change the source world or inherit permissions to private dependencies.

## 7. Revocation, in-flight work, and restoration

Check applicable grants, locks, policy watermarks, and freeze scope before new spending, on consequential continuation, and atomically before activation or protected publication. Tightening a relevant lock fences in-flight attempts. Unlocking later does not revive a previously revoked operation; a new eligible request must use current authority.

An unrelated lock or policy change can require fresh resolution without necessarily cancelling the request. Track relevant restrictions and base identities instead of treating every policy revision as a universal rejection.

Cancellation attempts to stop workers, but publication fencing is the correctness boundary. A stale result can remain a permitted draft/artifact; it cannot become active because a worker finished. A shared technical job must independently bind each consumer's permission and installation checks.

Fictional constitution/installation state participates in world saves. Current external grants, privacy erasure, real spending, safety revocations, and operation receipts cannot be rolled back by loading an older save. Loading rotates authority generation and must not revive old-generation authoring or publication. If an old saved law is now quarantined for integrity reasons, restoration follows the current safety/recovery policy rather than silently executing it.

Preserve same-version integrity and the active no-legacy-development-save policy. This design requires coherent live changes; it does not require supporting obsolete development save formats.

## 8. Quarantine and recovery

Quarantine is a runtime safety disposition, not an invention edit or a failed art review. Scope it to the affected definition, binding, process, or dependency-closed region of execution that can be stopped coherently. If stopping a required state owner has no safe fallback, pause the affected authority visibly rather than silently omitting mandatory effects.

Resource/work/disclosure bounds can be enforced deterministically. A non-deterministic wall-clock timeout is a technical fault, not a fictional outcome; reject uncommitted work and use the declared recovery boundary. Safety shutdown cannot invent a compensating source, refund already consumed game materials, or rewind unrelated events.

A repair creates a new candidate, retains evidence, tests against current dependencies, and activates through the existing migration policy. Reverting to a previously approved version is still a forward recovery operation with compatibility checks. Frozen status does not prevent quarantine, and clearing quarantine does not automatically remove author or owner restrictions.

## 9. Minimal implementation direction

Use immutable policy records/revisions and resolved references over existing world authority. Build dependency and protection indexes as derived views of admitted contracts. Keep authorization in deterministic application/domain code and project only permitted summaries.

The constitution must be explainable: `this request changes a frozen thermal-owner binding`, `this author disabled automatic appearance replacement`, or `the active world does not have the required source operation` is more useful than a generic locked error.

Numeric resource ceilings and confidence thresholds belong in versioned configuration under their proper authority. They are not universal fictional laws. The engine enforces the configured host/world bounds; a candidate can request a different allocation or narrower design, never raise its own limits.

See the [invention foundation](invention-foundation.md) for project coordination, [validation](invention-validation.md) for dependency and evidence checks, and [budgets](invention-budgets.md) for funding and runtime enforcement. Existing governance continues to own rights, authorship, origin locks, and pack consent.
