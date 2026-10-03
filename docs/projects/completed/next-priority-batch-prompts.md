# Five standalone implementation prompts

| Status    | Current progress                                                                                                          | Last updated |
| --------- | ------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | All five assignments and both combined verification scenarios are completed; multilingual input verification is deferred. | 2026-10-03   |

These assignments accompany the [feature specification](next-priority-batch-feature-spec.md), [technical design](next-priority-batch-tech-design.md) and [tracker](../../maintainers/next-priority-batch.md). These original assignments are retained as history: all five implementations are merged, NP01–NP05 are completed for their agreed scope, and both combined scenarios have passed; broader parent verification remains separately tracked. Do not restart completed implementation from these prompts. They do not require communication between workers. This document does not execute the assignments or create chats.

## 1. Reliable AI outcomes and spending

```text
Implement NP01: make AI execution failures, reported prices and spending reservations agree, and report oversized required character context accurately. Follow AGENTS.md and applicable repository guidance. Work independently; do not contact the other implementation chats.

Read the NP01 sections of docs/projects/completed/next-priority-batch-feature-spec.md and docs/projects/completed/next-priority-batch-tech-design.md, the technical design's Parallel boundaries, and docs/maintainers/next-priority-batch.md. They define the complete scope and acceptance. Then use docs/ai-providers.md and the design's exact accounting/limits references.

Repair the existing Macrofold outcome and dispatch classification; validate reported cost before settlement; honor the already accepted configured monthly allowance without the hidden $50 clamp; and route required-context overflow through the existing context-exceeded outcome. Keep explicit zero cost distinct from missing/invalid cost. Unknown execution or billing cannot silently release exposure; no automatic retry is part of the fix. Preserve the existing public final-result/receipt shape and the actual director/ledger path. Do not broaden this into prompt rewriting, provider/model migration or a new wallet.

Start with apps/server/src/macrofold.ts, store.ts, decision-context.ts and ai-director.ts; packages/ai/src/client.ts supplies the direct-adapter comparison. The prerequisite invention integration is already present. Streaming delivery is outside this assignment and must consume these same final outcomes.

Complete the NP01 acceptance, including rejected admission, accepted-but-uncertain execution, cancellation versus timeout, invalid output, malformed versus zero cost, late/repeated settlement and overflow before further dispatch. Keep the documented synthetic versus live evidence distinction.

Reconcile NP01, MW05, the selected Level-1 follow-up TODOs, CR12/CG09, LA182 and the WW07/WW11/WAF02/IER04 scope listed in the design, plus canonical provider/accounting documentation. Mark only demonstrated scope complete; leave broader deployment and deferred coverage open. Verification and documentation workflow remain governed by AGENTS.md.
```

## 2. Sensory work follows changed objects

```text
Implement NP02: when only a few objects change, prepare perception for those changes instead of repeatedly capturing and comparing every distant object. Follow AGENTS.md and applicable repository guidance. Work independently; do not contact the other implementation chats.

Read the NP02 sections of docs/projects/completed/next-priority-batch-feature-spec.md and docs/projects/completed/next-priority-batch-tech-design.md, the technical design's Parallel boundaries, and docs/maintainers/next-priority-batch.md. Read stage 2 of docs/projects/proportional-step-work.md as its broader parent; this assignment is only the precise NP02 child.

Extend the existing dependency, sensory-cache and native-step owners with phase-specific complete change notices, incremental source membership/dimensions/spatial preparation and old/new-neighborhood observer selection. Existing semantic changes alone do not prove complete coverage inside one unpublished advance. Preserve conservative rebuilds for unknown changes, overflow, restore, forks and failed speculative continuation. Derived indexes remain unsaved candidate selectors, never visibility or disclosure authority.

Source starting points are packages/domain/src/kernel.ts, encounter-cache.ts, dependencies.ts, perception-frame.ts, entity-index.ts, spatial-state.ts and draft.ts. PW08's existing improvements stay in place. Do not change movement timing, sense fidelity, event/random ordering, the authoritative entity table or the scheduler; do not cap witnesses or memories to show a speedup.

Complete NP02's parity and growth acceptance, including fleeting contact, multiple intermediate phases, containment, body/sense changes, cancellation and reopen. Show source-preparation work separately from exact sight tests, cold rebuilds, real dense fan-out and final publication. Report actual native/server evidence without claiming deployment capacity from a loaded host.

Update NP02 and its EPR02/PF12.3/PF13.11 child requirements, proportional-work stage 2, native-work limits, C18 and the relevant perception evidence. Preserve the still-open broader simulation and capacity work. Verification and documentation workflow follow AGENTS.md.
```

## 3. Craft with an invented material

```text
Implement NP03: an invented cordage material can be manufactured and then used in a later woven-container invention. Follow AGENTS.md and applicable repository guidance. Work independently; do not contact the other implementation chats.

Read the NP03 sections of docs/projects/completed/next-priority-batch-feature-spec.md and docs/projects/completed/next-priority-batch-tech-design.md, the technical design's Parallel boundaries, and docs/maintainers/next-priority-batch.md. Read docs/invention-composition.md section 3 and the family/container owners linked by the NP03 design.

Use the existing installed recipe-family, admission, dependency, craft and custody mechanisms. Add the authored intermediate and permit it only in the explicitly supported binding role after positive trusted-family/interface, exact-pin, structure, resource and quantity checks. Matching names or inherited tags are not certification. Preserve native-only requirements in other roles and do not transfer weapon, food or container behavior into a material or final output. World rules, wording and tuning belong under worlds/base.

Start with packages/domain/src/worlds/base/recipe-families.ts, camp-container-family.ts and items.ts, plus packages/domain/src/invention-families.ts and declarations.ts. Existing family-driven UI metadata and containers are already available. Do not build arbitrary recursive crafting, generated code, new physics, live-law replacement or automatic recipe knowledge.

Complete the entire NP03 journey: admit and manufacture the intermediate, discover it through permitted knowledge, admit and craft the container, use its capacity and reopen/reuse without regeneration. Cover resource conservation, cancellation, stale pins, cyclic/malformed dependencies, unknown/private material and a finished item with misleading inherited tags.

Reconcile NP03, the precise INV-3.5/INV-6.1–6.2/EWF09 children, RF01 and related limits, the composition contract and authored material/container docs named by the design. Preserve broader composition work and distinguish native versus real provider evidence. Verification and documentation workflow follow AGENTS.md.
```

## 4. Find and choose camp supplies

```text
Implement NP04: make existing camp work reachable through complete permitted object discovery, shared storage selection and explicit character inspection. Follow AGENTS.md and applicable repository guidance. Work independently; do not contact the other implementation chats.

Read the NP04 sections of docs/projects/completed/next-priority-batch-feature-spec.md and docs/projects/completed/next-priority-batch-tech-design.md, the technical design's Parallel boundaries, and docs/maintainers/next-priority-batch.md. Read docs/projects/next-playable-week/camp-activities.md under Observation, memory and ordinary UI, docs/worlds/base/camp-routines.md and the relevant UI handbook chapters listed in NP04.

Replace the camp form's first-32-object dependence with role-specific bounded pages and honest continuation. Reuse inventory-destinations.tsx for source-free storage selection. Preserve exact chosen identities outside the loaded page. Searching/selecting is read-only; Approach and Inspect contents are separate explicit native actions. Only admitted inspection supplies character knowledge of cache contents. Review and Start must recheck current evidence, access and resources.

Start with packages/domain/src/activity-hosts.ts, worlds/base/camp-activity.ts and inventory-inspection.ts; apps/server/src/activity-requests.ts and inventory-view.ts; the protocol views; and apps/client/src/ui/camp-activity.tsx and inventory-destinations.tsx. Existing materials/containers suffice; no new crafting feature is a prerequisite.

Complete NP04 acceptance in the actual game UI, including eligible objects beyond unrelated prefixes, paging, duplicate names, ground-cache approach/inspection, nested privacy, stale/revoked results, failed admission, finite camp work and the separate bounded watch. Preserve drafts, focus, readable wrapping, reachable controls and world-input isolation on narrow/short/enlarged layouts. Do not add new camp mechanics or force learning; manual execution does not prove voluntary retention/reuse.

Update NP04, the precise PW03/PW04/PW10, AC07/AC11, PO07, BW19 and UIUX02–04 requirements, camp rules/design, IW01/CR01/object limits and camp-life evidence. Keep unverified broader learning and interface acceptance open. Verification and documentation workflow follow AGENTS.md.
```

## 5. Read NPC replies before generation finishes

```text
Implement NP05: show a permitted unfinished NPC reply in a direct player conversation before the complete structured response finishes, then reconcile it with actual admitted speech. Follow AGENTS.md and applicable repository guidance. Work independently; do not contact the other implementation chats.

Read the NP05 sections of docs/projects/completed/next-priority-batch-feature-spec.md and docs/projects/completed/next-priority-batch-tech-design.md, the technical design's Parallel boundaries, and docs/maintainers/next-priority-batch.md. Read NC19 in docs/maintainers/narration-and-conversations.md and the canonical conversation, hearing, provider and UI owners linked by NP05.

First perform the NP05 actual-route feasibility/latency gate before substantial decoder/UI work. Demonstrate a safe earlier-display opportunity in representative ordinary replies; a constructed multi-operation fixture alone is insufficient. If the route cannot provide it, retain final-only behavior, document the concrete blocker and owner options, and leave NP05/NC19 implementation incomplete. Do not alter the response contract or force extra operations to manufacture a gain. If the gate passes, use one original provider request, bounded structured decoding and an attempt/viewer/conversation/timeline-scoped preview channel. Establish disclosure eligibility before releasing text; property order and a triggering chat alone do not prove whom generated talk addresses. Follow the design's conservative complete-operation gate where recipient metadata cannot be trusted earlier. Private reasoning, raw JSON and unrelated operations never become a preview. Preserve all final schema validation, current-state admission, gameplay effects and accounting.

Start with packages/ai/src/client.ts and types.ts, apps/server/src/macrofold.ts, cognition-contracts.ts and ai-director.ts, and the current conversation projection/UI. Existing World Agent streaming is reference infrastructure, not proof that structured NPC streaming works. Final outcome/receipt classification remains with its existing owner; do not create another billing path.

Mike's October 3 presentation direction overrides the original visible provisional-status sentence: the player sees only the existing waiting dots as the pending indicator, including beside provisional text until final-history reconciliation. Preserve accessible waiting information without visible provider/generation-status prose. The October 3 gate passed after Mike authorized correcting the decision model to Jev; read docs/verification/npc-reply-preview.md for actual qualified route, browser evidence and remaining acceptance. Do not extend that qualification to another adapter or caller.

Complete NP05 acceptance, including split escapes/Unicode, ambiguous recipients, no-speech/changed final output, malformed/truncated output, cancellation, stale attempts, access loss and reconnect. Show actual browser text before whole-response completion and measure first-readable versus total latency. Unsupported routes remain final-only and cannot count as live streaming success; do not change models or issue another call to simulate it.

Update NP05, the precise NC19/NC02/NC10/CR02/CR12 scope, canonical conversation/provider/UI docs and owning limits/evidence. Keep other structured callers and PW05/PW11 qualification open. Verification and documentation workflow follow AGENTS.md.
```
