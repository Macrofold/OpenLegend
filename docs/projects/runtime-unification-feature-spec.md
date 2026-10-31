# Runtime unification and unnecessary-work removal

| Status      | Current progress                                                                                       | Last updated            |
| ----------- | ------------------------------------------------------------------------------------------------------ | ----------------------- |
| In progress | Runtime conversions and scoped live interpretation checks pass; performance qualification is deferred. | 2026-10-31 20:12:39 UTC |

## 1. Purpose and baseline

Make the current perception, attention, memory and simulation architecture cheaper by removing parallel preparation, redundant representations and unused paths. Preserve useful capabilities from earlier systems through the current semantic owners before deleting their old implementation. Age alone is not evidence that a system is unnecessary.

The source baseline is local `codex/stealth-runtime-01-evidence` at `4e471d9097de4e8e98b23bdef227222ec20f16b3` in `Macrofold/OpenLegend` (`origin`: `https://github.com/Macrofold/OpenLegend.git`). It includes the compact-grant, retention-metadata and lazy-onset corrections. The source audit establishes reachable work, not its measured share of current runtime. Earlier throughput results do not measure this commit.

This is an authorized implementation project. It complements the [attention runtime design](attention-and-scenes-runtime-design.md), not a replacement perception model or a claim that SR04/SR07 acceptance is complete. The [technical design](runtime-unification-tech-design.md) owns the source inventory, exact conversion instructions and qualification plan. The [RU tracker](../maintainers/runtime-unification.md) distinguishes implemented conversions from outstanding qualification.

## 2. Player and character behavior to preserve

- People, animals and objects remain visible according to received evidence, even outside detailed attention. Current detail, recognition, known names and historical knowledge retain separate permissions and freshness. A scheduler or UI read never grants a new observation.
- Detailed attention automatically retains actual received temporal changes within the existing window and quotas. It needs no following action. Selecting a subject grants no route from before attention began. Loss updates current support and preserves appropriate last-known evidence; it does not require a second prose event merely to represent the same loss.
- A broad scene and independently acquired physical features remain available when detailed slots are occupied. In the daughter/cliff/crowd scenario, fifteen enemies do not make five invisible or force the cliff to compete for a body slot. This project preserves the existing native cues and context; it adds no special daughter/cliff rule.
- Speech, impacts, action outcomes, deliberate inspection, acquired knowledge, meaningful outward changes, cooperation and obligations retain their exact supported evidence and timing. Useful retained accounts survive cold storage and restart. Correction/forgetting revoke dependent information immediately even when physical cleanup is deferred.
- World time, bodily processes, animals, movement, collision and committed action effects continue independently of optional cognition. A wakeup does not automatically purchase a model call. Existing quiet continuations, urgency, fairness, paid-call admission and recovery remain.
- A person can retain beliefs, relationships, identity, commitments and fallible interpretations. Protected identity and exact evidence links survive consolidation of storage. An old verifier passing an alternate pipeline is not evidence that the live game supports the same behavior.
- Inventory pages, learned methods, private notes and known places remain discoverable. Required tools and promised terms cannot vanish because optional context is paged. Partial inventory cannot justify a claim that an item is absent.
- Walking, gathering, replenishment, dropping possessions, construction and permissions retain their present results and deterministic selection order. The same request must not become a different gameplay action merely because candidates are selected more efficiently.

## 3. Scope and decisions

### Selected engineering direction

1. Consume changes and permitted projections from existing owners instead of independently discovering the same state in each consumer.
2. Select identities and dependency metadata before constructing descriptions, cloning bodies or querying history. Batch independent exact lookups within one authorized snapshot.
3. Keep one canonical copy of authored personal prose. Workspace files, combined context and inspection displays are projections; publication receipts and typed evidence metadata remain distinct.
4. Reuse existing entity membership, spatial queries, ActorWork, dependency tracking, native deadlines, record changes and retention metadata. Add narrow missing query/index support there; do not introduce an event bus, universal dependency framework, new queue service or new database.
5. Replace current callers together. No compatibility layer, parallel old pipeline, save migration or alternate implementation remains solely for earlier development iterations.
6. Preserve current clock, sensing, attention, retention, context, admission and model defaults except the explicit Q3 reasoning-effort decision. Changing another is a separate behavior decision, not an optimization hidden in this project.

### Decisions selected by Mike — October 31, 2026

**Q1 — Remove routine sighting history.** Do not create automatic arrival/departure history entries merely because an ordinary person enters or leaves view outside detailed attention. Preserve current visibility, meaningful outward changes, required occurrences and attended chronology. Current perception already owns brief-loss continuity through `perceptionEvidence.gaps`; preserve that mechanism and its existing world-owned grace, independent of narration rows. This deliberately removes routine history noise, not perception or useful identity continuity.

**Q2 — Preserve structured belief/relationship editing.** Integrate the older path's useful typed interpretations, including confidence, trust and evidence links, into the current reflection/dream publication before retiring the alternate pipeline. Keep one prose owner and preserve existing typed records. Confidence/trust remain subjective interpretations and do not replace shared familiarity or mechanically set relationships. This adds no new sensing-time/model loop: updates occur within already admitted reflection. During sleep-eligible daily review, the first existing summary request may also return an imagined interpretation with short thoughts and optional file/record edits, once per sleep episode. These edits publish atomically with faithful source consolidation; invalid edits retain the previous accepted state. No extra model request is added.

**Q3 — Task-selected reasoning effort.** Reflection and dreams default to medium effort; ordinary generation defaults to low, and a caller can explicitly select higher effort for difficult work. Native tool access does not select reasoning difficulty. Preserve existing model, token ceilings, cadence, tool-round and spending limits while qualifying this change. New sessions use the selected effort; existing sessions retain their admitted parameters. No extra routing call or automatic paid retry is added.

No other gameplay removal is proposed. The technical design's retention/disposition table distinguishes useful existing behavior from removable preparation. Any newly discovered capability without an established replacement requires a question before removal.

## 4. End-to-end acceptance

| Journey                                                                           | Required outcome                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A previously unknown person enters, moves, changes appearance, leaves and returns | Current visibility, recognition uncertainty and permitted changes match the installed policy; detailed chronology begins only when actually attended; routine onset/departure alone creates no history wrapper; body visibility and continuity remain. |
| A quiet object becomes relevant after a goal changes                              | Existing discovery and cause selection can consider it without resensing the world in the thought scheduler or adding a model call per sighting.                                                                                                       |
| Daughter and fifteen enemies approach a perceived drop                            | Broad bodies, acquired terrain, attended sequence and supported cues reach the existing consumer; missing knowledge remains unknown; native movement/reactions do not wait for AI.                                                                     |
| A long-lived character thinks with many possessions, methods and notes            | Required support is exact, optional candidates are selected before hydration, coverage is explicit, and omitted items remain inspectable/searchable.                                                                                                   |
| A promise is made, fulfilled, cancelled or overdue                                | Existing terms, status, completion evidence and distinguishable terminal causes survive; ordinary dialogue does not become an agreement or permission.                                                                                                 |
| Reflection changes a belief, then its source is corrected                         | One accepted prose owner supplies cognition/inspection/workspace views; protected identity, permitted typed records, revision guards and reconsideration survive correction and restore.                                                               |
| Construction permission is revoked during ongoing work                            | Commit-time authority still refuses unsupported effects; completed authorized effects remain; reducing candidate scans does not cache authorization.                                                                                                   |
| Save/reload with cold history, navigation pending and optional work delayed       | No replayed reception, duplicate model call, resurrected source, lost route task or missed due expiry; derived indexes rebuild from current canonical state.                                                                                           |

The technical design supplies per-module checks and exact growth axes. Functional equivalence, fewer redundant visits and complete-game performance are separate claims. Mike deferred further performance measurements on October 31; the outstanding full-game operating passes remain with SR07/PF and are not established by this delivery.

## 5. Delivery stages and non-goals

Deliver in the [RU task order](../maintainers/runtime-unification.md): acquired-view reuse and narrow navigation first; incremental history/authority preparation; selected context and batched lookups; canonical mind/verification reconciliation; local query and dead-state cleanup; then integrated qualification. Stage boundaries permit review, not silent omission of remaining agreed scope.

No new senses, attention mechanics, personality inference, memory decay rules, AI model, scene graph, world-event archive, region simulation, ECS rewrite or renderer rewrite. No total-population promise follows from the existing configurable limits. Advanced vision/acoustics, attention/combat, full PP07/SAI-A and broader SC/PS acceptance keep their current owners.

## Maintained records

- Implementation and decisions: [RU tracker](../maintainers/runtime-unification.md).
- Mechanism and source audit: [Technical design](runtime-unification-tech-design.md).
- Limits: [NW20](../limits/native-work.md#nw20--runtime-unification-preparation), [CG04](../limits/cognition.md#cg04), [CG10](../limits/cognition.md#cg10), [CG18](../limits/cognition.md#cg18--structured-interpretations-in-unified-reflection), [attention/runtime limits](../limits/product-scalability.md).
- Existing delivery: [PS04-A/SR](../maintainers/product-scalability.md#ps04-a--core-attention-and-recording), [EPR](../maintainers/events-perception-and-reactions.md), [SC](../maintainers/cognition-context.md), [PF](../maintainers/performance.md).
