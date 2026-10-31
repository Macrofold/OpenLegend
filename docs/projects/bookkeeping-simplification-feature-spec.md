# Simpler saving and personal evidence — feature specification

| Status      | Current progress                                                                         | Last updated |
| ----------- | ---------------------------------------------------------------------------------------- | ------------ |
| Not started | Design is complete; implementation and operating acceptance remain open under BK01–BK07. | 2026-10-31   |

**Design selected 2026-10-31, 05:10 UTC.** This project replaces unnecessary persistence and evidence-lifetime machinery while preserving the game’s current sensory, attention, memory and action behavior. Its [technical counterpart](bookkeeping-simplification-tech-design.md) specifies the replacement and removal order. This is a design deliverable, not an implementation or a measured speedup.

## 1. Outcome

People should move, cooperate, pursue animals, build things and talk without the server repeatedly reorganizing their memories merely to save their next action. A witness can remember a meaningful sequence and later disagree with another witness because they received different evidence. An ordinary walk need not become a permanent diary. A remembered person, useful place or promise must survive without preserving every coordinate that preceded it.

The server runs the authoritative world in memory, sends permitted live updates to clients, and batches changed records directly into ordinary PostgreSQL transactions. Selected recent experience is append-oriented. Stable, sufficiently rich received values remain shared. Physical deletion happens in bounded background batches; access, expiry and correction take effect through their semantic owners immediately.

This replaces the custom durable change journal and its later application stage, hidden physical-page decisions on live objects, and separate accepted/applied/pending ownership catalogues. It does **not** remove PostgreSQL’s own transaction recovery, command receipts, protected accounting or coherent save/load.

The [contact/group redesign](attention-and-scenes-runtime-design.md#13-proposed-structural-replacement-contacts-and-grouped-receipts) supplies the native current-perception foundation. It removes redundant per-field records and persisted derived attention candidates. This project integrates that work and replaces its retained journal/shared-slot storage machinery; it does not create another perception model or task queue for those native changes.

## 2. Behavior to preserve

- **One server-owned reality.** Clients send intentions and render permitted state. Saving less frequently never transfers authority to the browser. Network updates do not wait for routine database flushes.
- **Actual reception.** Stored world position, personally observed position and remembered position remain different facts. Personal evidence never follows an unseen object by dereferencing its current entity.
- **Independent detail.** A fresh position does not refresh an older face, name, weapon or activity. Observation time, support, source revision, uncertainty and the receiver’s actual frame remain available where they change meaning.
- **Broad awareness and finite detail.** Detailed attention does not cap visibility. It automatically retains supported temporal changes while selected; it requires no watch/follow command. Required speech, own effects, knowledge and obligations keep their independent admission.
- **Useful memory.** Recent detail is reliable at the actual admitted sampling resolution while retained. A useful account may survive; trivial sequences may disappear. Expiry neither guarantees a summary nor purchases an AI call.
- **Current defaults.** Keep selected-world acquisition periods, Focus/attention allocation, familiarity/recognition, current-detail semantics, recent/lasting/speech allowances and ordinary action timings. The [base-world profile](../worlds/base/attention.md) remains their sole author. This project changes storage granularity and execution, not sensing fidelity to improve a benchmark.
- **Exact consequential effects.** Existing player commands, accepted NPC responses, editing, pause/load and protected financial/authority operations retain durable confirmation. Routine native progress retains background saving. New volatile command modes are outside this project.
- **Private personal history.** Another observer’s reference to a shared payload does not make it remembered, understood or visible to this observer. Correction, forgetting and current privacy restrictions apply to cold data and restored checkpoints too.

The [attention feature](attention-and-scenes-feature-spec.md#94-receiving-attending-and-remembering-are-separate-decisions) owns the full gameplay contract; this project changes its physical storage and lifetime implementation only. Full vision/acoustics, attention/combat integration, PP07/SAI-A, aggregate crowds and new semantic cognition remain their existing unfinished scopes.

## 3. What saving promises

“A command” means an admitted request such as move to a point, pick up an item, speak or edit a record. A confirmation reports the result of that request; it is not the same event as every later movement update. A “save package” is a coherent captured set of state and dependencies, not an extra game mechanic. The custom journal’s package of changes is removed; manual checkpoint files remain useful.

| Activity                                                                             | Live behavior                                                                            | Durability and failure                                                                                                        |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| An already accepted walk, animal movement, native meters and their received evidence | Advance and publish from server memory through existing coherent native transitions      | Batch with routine progress; a crash can lose the unsaved suffix                                                              |
| A player command or accepted NPC action/reply                                        | Validate against the current world; publish success/effects after its direct transaction | Save preceding progress, effects, required evidence and receipt atomically; no acknowledged half-transfer or duplicate action |
| A model thinking, optional recall/indexing or memory consolidation                   | Runs outside the world’s mutation turn                                                   | Cannot freeze walking; late results require current source/permission checks and existing spending admission                  |
| A manual checkpoint or restore                                                       | Establish one complete cut; restore opens paused under existing authority                | Preserve the previous usable checkpoint on failure; no cold-history omission or replay of already committed effects           |

Retain the current roughly one-real-second background-save opportunity and its existing slow-storage/backpressure limits, defined in [persistence limits](../limits/persistence.md). This is not a hard one-second crash-loss promise: storage duration and queue delay contribute. Report the age of the last durable cut. Healthy clients see movement independently of that age. A storage failure pauses authoritative admission explicitly; the server does not silently continue accumulating unlimited unsaved play.

The durable command path can briefly hold world mutation while the direct transaction finishes. Removing this barrier would require optimistic effects and rollback/compensation, which would reintroduce complexity without evidence that the remaining barrier is the bottleneck. Batching queued commands is allowed; delaying an idle command to fill a batch is not.

## 4. What is stored, and why

| Meaning                             | Stored form and lifetime                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Current world truth                 | Latest ordinary entity/component state, with existing native continuation and saved randomness                                                                     |
| Current personal view               | Bounded current contacts/features, sparse per-field freshness/support and the existing limited motion baseline; no lifetime sightings list                         |
| Recent attended/required changes    | Ordered personal frames in bounded logical chunks; immutable batches append only new frames to SQL                                                                 |
| Shared received detail              | One immutable, viewer-compatible value for stable body detail, richer descriptions or geometry where sharing is useful; references identify values, not permission |
| Lasting knowledge or memory         | A selected account and its minimal exact support or explicitly less precise provenance; no automatic ownership of the entire source chunk                          |
| Search, display and scheduling aids | Derived from those owners, rebuilt or invalidated as needed; not another writable account of what happened                                                         |

Small changing measurements, including position/heading, stay inline in their personal frame/current record. Stable or richer detail remains shared across compatible recipients and samples. This deliberately trades a little duplicated scalar data for fewer payload rows, references and deletion decisions. A producer family declares its representation once; no runtime size heuristic, global deduplication scan or alternate shadow store is added.

The illustrative body samples discussed in this design were about 298–323 bytes of compact JSON; pose was about 75–78 bytes and stable detail about 221–249 bytes. They included rendering identity, dimensions, outward state and optional visible properties, not just coordinates. These are small source-inspection examples, not a capacity measurement. Richer mechanics can grow details, reinforcing the reason to keep stable-value sharing. Evaluate total benefit using value size, actual compatible recipients, update frequency and retention, including row/index/reference costs.

Perspective differences already matter: received clipping, clarity, precision and permitted fields select compatible values. Future detailed front/back body-part visibility belongs to the vision owner. Sharing never authorizes storing the hidden “complete body” in everyone’s personal context.

The AI receives selected permitted current information and recent changes, not raw database rows. Existing model projections omit artwork identifiers, icons and storage bookkeeping, and select usable labels, spatial/body detail and relevant descriptions. Storage compaction must not become prompt truncation or additional sensory acquisition.

## 5. Complete journeys

### BK-J01 — An ordinary shared walk

A player’s movement command commits once. The server subsequently advances movement and observation in memory, publishes permitted changes to another connected player, and saves progress in ordered background batches. Updating current position coalesces between saves; admitted attended samples and discrete occurrences retain their order. The second player sees motion before the next routine database flush. A crash restores the last complete saved cut, including its associated personal evidence, without inventing the unsaved route.

### BK-J02 — A deer disappears

An observer receives a deer, later gives it detailed attention and receives several movements. History starts from the actual available baseline; earlier unrecorded travel cannot be retrieved from another witness or global truth. Current contact closes through one supported availability transition. Last received position and retained chronology remain dated. The loss does not create an autobiographical memory by itself. A later deer is not identified from hidden entity identity. When detail expires, a separately retained useful impression or knowledge may remain; otherwise it is gone.

### BK-J03 — Daughter, pursuers and a cliff

Broad current evidence can include more people than the detailed slots. Familiarity can prioritize a legitimately recognized daughter without asserting affection or hostility. Independently received physical features keep the cliff available outside those slots. Existing bounded relational queries combine received movement and geometry; no all-pairs relationship log or hardcoded “daughter danger” story is stored. Native supported reactions continue before optional model interpretation. Personal frames preserve attended changes; the AI sees the selected current scene and recent change, not every coordinate in storage. Saving/cleanup does not add sensing or model work.

### BK-J04 — A route, work and a later recollection

An attended unknown person passes an anvil, enters a visible furnished room, works, eats and returns to speak. Exact received changes and occurrences retain their order without guessed episode boundaries or an inferred anvil destination. A kitchen category can be inferred from acquired furnishings/activity; a proper name remains separate knowledge. A selected useful recollection may survive as an impression. Necessary learned identity, name, place or promise copies only its exact support. Deleting the old recent chunk cannot delete that independent support; neither support nor the impression resurrects the entire route.

### BK-J05 — Shared detail, different witnesses

Several observers receive the same deer appearance. One shared immutable value can serve them. Their positions, times, received frames and permitted detail remain personal. Another observer with poorer or different reception gets a different variant or less information. Forgetting one person’s account removes only their eligibility and dependent personal material; a different witness may still own the shared value. Once no real owner needs it, ordinary background deletion removes the whole value.

### BK-J06 — Correction, cold history and restoration

A selected source is corrected or explicitly forgotten while recall is running. The semantic change invalidates its exact dependents before later publication. Cold SQL and temporary model copies cannot bypass it. Logical withdrawal does not wait for physical cleanup; a bounded maintenance pass later removes unnecessary rows/index entries. Same-format restore preserves the coherent fictional cut but applies current external privacy, access and spending protections. Refusing an incomplete checkpoint inspection changes no live object, physical layout, pending write or subsequent save.

## 6. Why this improves the game

The distinctive payoff is remembered consequence without omniscient recording: a companion recalls helping make a useful object, a rival recognizes a return without becoming friendly, and witnesses give honestly different accounts. Quiet discovery still allows a portrait or beautiful place to matter without a reward system. Fast ordinary movement gives those encounters room to happen; cleanup and save machinery should be invisible during healthy play.

These are uses of existing actions, cognition and knowledge, not new quest, relationship or scene frameworks. Qualify a small encounter and useful return before making any crowd-capacity claim. Scripted correctness demonstrates supported behavior; voluntary player interest remains separate human evidence.

## 7. Scope, alternatives and acceptance

Deliver one direct transactional persistence path, explicit append batches, useful shared values with simple ownership, independent minimal retained support, bounded asynchronous cleanup, pure capture/validation and all current producers/consumers. Remove superseded mechanisms in the same current-format conversion. No released-save migration, dual writer, fallback journal, region service, generic garbage collector, event-sourced engine or additional paid maintenance loop is included.

Copying every received body would simplify deletion but multiply richer stable values. Sharing every tiny scalar would save some payload bytes while multiplying rows and bookkeeping. The selected hybrid keeps each benefit where its lifetime justifies it. A custom journal might reduce a narrow acknowledgement cost, but this project prioritizes one durable truth and lower complete-path work. Faster hardware, more workers and reduced sensory cadence are not substitutes for completing these removals.

**Required pass:** BK-J01–BK-J06 through actual supported acquisition, public/NPC consumers and PostgreSQL continuation; coherent save failure/retry, exact correction/forgetting, no cleanup on an ordinary command path, and the existing standard/substantial normal-clock operating gates. **Required measurement:** full storage/index/heap cost, sustained cleanup, dense populations, mature-history distributions, faster clocks and strict-command latency under the [technical acceptance plan](bookkeeping-simplification-tech-design.md#10-acceptance-and-measurement). A failed required pass leaves implementation unready; a capacity exploration does not become an unsupported population promise.

## 8. Decisions and maintained records

No product decision is left open for this design. Numerical engineering envelopes are provisional and must be qualified; performance and human enjoyment are unproved, not unresolved architecture choices. Implementation is not authorized by this document alone.

- Implementation and dependencies: [BK00–BK07](../maintainers/production-data.md#bookkeeping-simplification).
- Limits and constraints: [BKS-L01–BKS-L05](../limits/persistence.md#bks-l01--direct-transactional-saving-target), with unchanged [attention/memory policy](../worlds/base/attention.md).
- Mechanisms, schema, removal map and step-by-step delivery: [technical design](bookkeeping-simplification-tech-design.md).
- Existing operating acceptance: [PS04-A SR04/SR07](../maintainers/product-scalability.md#ps04-a--core-attention-and-recording); saving and privacy: [save/load](../save-and-load.md), [memory](../memory-architecture.md).
