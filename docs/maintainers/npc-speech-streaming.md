# Shared NPC speech streaming implementation tracker

## Scope and status

**Design done; implementation pending, October 18, 2026.** [The feature specification](../projects/npc-speech-streaming-feature-spec.md) and [technical design](../projects/npc-speech-streaming-tech-design.md) select immediate growing public text for all NPC dialogue producers. One occurrence fixes its audience at first durable text, retains every accepted prefix, closes once and enters semantic consumers once. No physical speaking duration, environmental progression or audio is selected. [NST-L01–NST-L09](../limits/npc-speech-streaming.md) own the new constraints.

This completes the public-text design slice of [NC19](narration-and-conversations.md#nc19--progressive-display-of-structured-conversation-replies) and [ND16](needs-design.md#nd16--hearing-and-communication-beyond-direct-path-speech). It does not check off runtime delivery, NP05's separate historical scope, residual private/full-harness caller qualification, SPK/HE acceptance or optional ND16/DG26 media/acoustics. Do not copy these task bodies into their trackers; link the applicable NST ID.

## Dependency order

The implementation baseline is the accepted **SPK01–SPK06 ordinary speech/evidence/context contract**, with SPK09's affected caption/composer/history presentation and the applicable SPK10 persistence/authority obligations integrated in the same coordinated work. If they have not landed, implement those prerequisite core tasks first, or earlier in the same branch; do not create an alternate conversation-era schema and a later compatibility adapter. SPK07–SPK08 animal/controller work, media and completion of all wider SPK/HE/NC qualification are not prerequisites. If sound-only SPK receivers are already enabled, NST must preserve them through the same lifecycle and readiness contract.

| Task | Depends on | Concrete result |
| --- | --- | --- |
| NST00 | This design task | Settled paired design, limit inventory and reconciled owners. |
| NST01 | Relevant SPK core contract | Native appendable speech, frozen evidence, exact mask, current-format validation and ready-order representation. |
| NST02 | NST01 | Atomic durable amendments, history references, restore and privacy integrity. |
| NST03 | NST01–NST02 | Every semantic read/scheduler consumes only terminal evidence using its readiness order. |
| NST04 | Shared response contract; may run alongside NST01–NST03 | Strict generated records, canonicalization, final normalizer and complete-record parser. |
| NST05 | NST04 | Qualified provider progress interfaces for ordinary Macrofold/direct and apply-mode escalation. |
| NST06 | NST01–NST05 | Bounded screened publication attempt, exact decision ownership and terminal/accounting coordination. |
| NST07 | NST01–NST02; shared public schema | Scoped cumulative upserts, active pins and coherent server/client patch application. |
| NST08 | NST07 and affected SPK09 baseline | Growing captions and Events/source readers with continuous reading/accessibility. |
| NST09 | NST01–NST08 | Integrated native/provider/database/browser/privacy/workload evidence and enablement disposition. |
| NST10 | NST09 | Reviewed coordinated cutover and accurate maintained records. |

NST01 data-shape changes include all current-format validators/serializers in that same cut. NST02 is not permission to write unsupported records first. No early public path is enabled until NST03's semantic gating, NST06's durable/screened owner and NST07–NST08's consumers are present. The work can use intermediate commits, but there must be one current generated/public/save contract at the cutover, with no old-shape fallback.

## NST00 — Complete the selected design and reconcile owners

- [x] Record Mike's immediate-text and all-public-dialogue choices, fixed first-publication audience, irrevocable accepted prefixes and one terminal semantic boundary.
- [x] Specify parser/producer, native evidence, privacy, history, save/recovery, delivery, caption and decision/accounting contracts with exact failure behavior.
- [x] Create paired project documents, this implementation owner and the limits inventory; reconcile NC19, ND16, NP05, SPK/HE and canonical consumers without marking implementation done.

**Exit:** the selected scope has no unanswered product question. Every delivery/qualification requirement belongs to an unchecked task below or an explicitly linked existing release owner.

## NST01 — Native lifecycle and frozen observer evidence

- [ ] Add the typed open/complete/interrupted speech lifecycle, exact operation progress binding, append digest/revision and terminal ready order through domain speech/events/response/types; keep authored/player complete speech on the same owner.
- [ ] Implement pure begin/append/close transitions, stable event/time/order, one complete hearing snapshot, retained permitted observer capsules, exact duplicate no-op and conflicting/stale append rejection. Do not use generic event correction.
- [ ] Implement incremental whole-field trim canonicalization and the pinned island/pair mask from the technical design. Preserve raw 1,200-unit admission counting, literal internal whitespace, Unicode scalar/grapheme boundaries and actual persisted fragments.
- [ ] Separate physical partial tier, detected/recognized/addressed roles and current nonempty quotation. Make introduction learning terminal, exact-event, frozen-association and actually-heard-name based.
- [ ] Update current-format validation, save encoding and all atomic native speech callers together. Complete/interrupted records cannot reopen; no empty occurrence or unowned open receipt is valid.

**Exit:** Q01–Q05 and Q11's pure-domain fixtures pass, including all scalar splits, hidden first words, multiple utterances and movement after the initial snapshot. Occurrence and observer counts stay constant across appends. No model, database or client owns speech semantics.

## NST02 — Durable amendments, history and restore

- [ ] Extend `WorldService.commit`/history preparation with the narrow trusted speech delta. Validate unchanged immutable facts, update exact event lookup and persist before publication. Preserve benign content updates without raising transcript/security epochs.
- [ ] Amend canonical speech, changed observer bodies and exact history/source references atomically through the existing repository transaction. Preserve original row/order and avoid delete/reinsert or cumulative-prefix archival per batch.
- [ ] Carry exact amendment keys through `applyWorldTables`, the typed validated `speechAmendments` journal delta, `applyRecordSources`, `MemoryRepository.project` and record-source writes. Exempt only these open-prefix changes from archives/lexical/compaction churn; preserve unrelated corrections in mixed writes and reject invalid replay proofs.
- [ ] Retain bounded active event/account references across recent-view and hot-awareness rollover. Use actual complete audience indexes; do not scan/hydrate all retained history or sample listeners.
- [ ] Ensure forgetting, erasure, authority revocation and actor retirement suppress future projection without recreating revoked accounts. Update all relevant source hashes/references without exposing raw global revision changes.
- [ ] Persist/recover the accepted prefix, mask continuation, pins and operation binding. Startup/restore closes captured open speech interrupted once, allocates readiness without provider dispatch and keeps operational charges outside gameplay rewind. Inject failures before commit, during save, after commit/before notification and at recovery.
- [ ] Reject an unsupported open mask pin before installing/projection/closure of a candidate save; leave the current world intact. Persist closure under the old supported pin before a planned runtime upgrade. Terminal stored fragments do not require remasking.

**Exit:** Q06–Q08 and Q11 preserve exact saved words and history position in the supported database lifecycle. A failed commit exposes no new words; a committed terminal missed by notification is found through normal readiness reconstruction. No fallback to periodic unsaved publication.

## NST03 — Terminal semantic readers and readiness

- [ ] Add one shared semantic eligibility/order selector: open speech is ineligible; terminal streaming speech uses saved ready order; ordinary evidence uses its existing order.
- [ ] Change experience conversion, unseen selection, director filters/maxima and response-interruption scans to that meaning. Remove occurrence-order early exits that can miss an older occurrence closed after the considered watermark.
- [ ] Audit hot/cold recall, selected-source reads, response context, compaction, lexical/vector model indexes, summaries, reflection/dreams, Narrator, appraisal/name/commitment and action-experience consumers. All must omit open text, including incidental reads during unrelated work.
- [ ] Make terminal readiness/consequences idempotent through existing actor-work/decision/source ownership. Preserve exactly one ordinary awareness account and one semantic opportunity; no new scheduler or per-part decision.
- [ ] Store the post-allocation native order, preserve durable-nextId clamps, update response-watch/prepared-source maxima and revalidate compacted source-set membership when an older utterance becomes ready. Do not replace time watermarks with sequence counters.
- [ ] Preserve interruption metadata in model-facing structured evidence without leaking operational diagnostics or inventing the missing ending. Coordinate sound-only native reactions if that SPK receiver capability is enabled.

**Exit:** Q04 and Q09 show an occurrence opened at order 12, later evidence considered at 13, then speech closed at a new ready order, eligible exactly once without moving history. An unrelated prompt prepared while it is open contains none of its prefix or hidden metadata.

## NST04 — Generated records, exact canonicalization and parser

- [ ] Replace generation-facing speech with strict start/text/end records plus the existing non-speech operation variant. Update request-bound schema, Zod/native normalization, prompt prose, examples and decision-escalation response task together.
- [ ] Change `compileDecisionTask`'s generated q0 property order and prompt/examples to `status, reason, value`, allowing the exact answered/null gate to complete before response records. Keep arbitrary-order decoding safe and bounded; later gate fields must withhold earlier records.
- [ ] Extend the approved JSON parser wrapper with typed complete-record array selection and narrowly selected complete escalation status/reason scalars. Validate actual ancestor path/array parent/index, duplicate keys, local IDs/dependencies, Unicode and all aggregate bounds.
- [ ] Preserve exact join/whole-field trim semantics across arbitrary transport splits. Derive part identity from trusted parsed position; do not accept model-supplied public sequence/count/receipt metadata.
- [ ] Define the leading-speech barrier and final ordered native normalizer. Retain optional empty decisions, all non-speech kinds, permitted invention envelopes and no early effects after a barrier.

**Exit:** Q02–Q03/Q10 pass independent expected-output fixtures for reordered properties, escaped strings, duplicate keys/IDs, wrong path or object masquerading as array, malformed suffix, missing end, oversized raw text, and every operation combination. Completed and streamed adapters produce the same normalized response for valid input.

## NST05 — Provider adapters and all public callers

- [ ] Extend the provider-neutral progress contract for accepted execution identity, the exact structured-output channel and unusable/terminal observation without moving native/screening/spending policy into the AI package.
- [ ] Preserve Macrofold fast/complex accepted Run recording, bounded stream decoding, same-Run observation, no replayed prefix, final comparison and receipt/uncertain-cost handling.
- [ ] Implement direct Responses streaming in the existing adapter; select assistant text by typed item/content identity and handle refusal/reasoning/incomplete/failure distinctly. Keep completed-output generation through the same record normalizer.
- [ ] Wire player, NPC, overheard and autonomous `npc_response` producers. Wire apply-mode escalation response with complete `answered`/null-reason gate and exact q0 ownership; observe mode and non-public tasks supply no publisher.
- [ ] Maintain a route capability/qualification record. Full-harness future callers require a qualified typed response channel; no World Agent progress shortcut. An unqualified route is explicitly completed-output-only, never an automatic second request.

**Exit:** Q02/Q10/Q12 route fixtures prove one original request per response, selected-channel privacy, cancellation accounting and no preview-only default. Live claims remain pending NST09 and the existing authorized provider/release gates.

## NST06 — Screened publication and decision ownership

- [ ] Add one tracked server publication attempt per original response group using the technical design's exact claim, parser, screening and cumulative pending state. `onProgress` remains synchronous observation; no detached async writes or one promise per token.
- [ ] Apply the qualified passage gate before native acceptance. `allow` approves an exact canonical boundary, `hold` retains bounded private text, `stop` fences the suffix. Do not screen independently per listener or log raw rejected content into normal evidence.
- [ ] Implement immediate first commit, 250 ms continuation coalescing and prompt terminal flush through WorldService. Revalidate the exact admitted attempt and current required authority inside each commit.
- [ ] In the same first-publication transaction, bind the original response group to the publishing attempt and consume its source cursor once without closing the group or writing the full-response receipt. Forbid same-group replacement/escalation/paid repair after accepted text.
- [ ] Support the same durable claim for non-decision jobs without inventing a group/cursor. Use the shared accepted-progress predicate in retry, urgency, immediate deferral, escalation, finalization and restart. Preserve the claim across stale operational job updates and receipt/timing CAS revisions.
- [ ] Keep own open evidence outside semantic validity/urgency proofs; preserve actual independent source, control/life, deadline and pause rules. Finalize/fence before terminal notifications can cancel the attempt's own completed work.
- [ ] Coordinate terminal receipt observation, parser completion, full validation, screening/drain, close/readiness, remaining ordered native operations and decision closure. A provider failure preserves accepted prefixes and original financial obligations. A database outage withholds effects and uses recovery closure; no new request is dispatched to fix it.
- [ ] Implement exact-binding close-only cleanup that remains authorized after speaker/job/deadline invalidation, through the current world's commit gate. Preserve route-specific pause behavior, including escalation-child cancellation; no cancelled attempt resumes automatically.

**Exit:** Q03/Q06/Q08/Q10/Q12 cover all races and failure cut points, with one event/receipt/readiness, unchanged accepted words, no late suffix and no duplicate spend. PD07 screening qualification is a release gate, not established by prompt/schema tests.

## NST07 — Scoped delivery, active pins and client patch contract

- [ ] Add common `speechPublication` lifecycle/revision outside optional linguistic `speech`, including sound-only speech-origin observations, and same-ID cumulative speech upserts to the existing GamePatch. Update EventEvidence/server projection, public schemas, validators and client application coherently with outer scope/base/next revision checks; never fabricate a linguistic payload for lifecycle handling.
- [ ] Validate same-ID speech in both full membership replacements and `speechUpdates` against the previously accepted body before replacing it. Reject duplicate IDs, stale/rewritten/reopened speech and conflicting equal revisions through reset; only explicit authoritative baseline/reset bypasses prior membership.
- [ ] Include entitled open speech beyond the ordinary recent tail in full snapshots. Stage a closed final snapshot only for an applicable admitted live game connection and retain it through its next scoped publication handoff; never wait for client acknowledgement. Charge encoded staging and replay to their shared 1 MiB channel budget, reset/release on overflow, and never mutate a published view during pin retirement.
- [ ] Merge only changed observer-permitted bodies. Global source length, mask offsets, hidden identities and provider/record counters never enter DTOs or observer-local revisions.
- [ ] Return validated speech changes from the pure patch reducer and synchronously hand them to existing caption/loaded-history owners before React batching. Keep a synchronously current accepted view/scope; remove duplicate live speech admission from scene `setView`, and use explicit baseline/reset entry. No absent-consumer queue.
- [ ] Reuse existing connection admission, bounded replay, coalescing, blocked-write behavior and resets. Distinguish bytes accepted by `write(false)` from unsent bytes. One stalled client cannot block native commits or other channels.
- [ ] Clear obsolete projections on revocation/timeline/control reset. Resume only currently open permitted speech after reconnect; no completed-caption replay or new generation/hearing.

**Exit:** Q05/Q07/Q08/Q13 cover duplicates, gaps, stale scope, hidden-only appends, tail rollover, unchanged-text terminal closure, replay exhaustion and a stalled recipient. Current capacity code and connection counts are unchanged.

## NST08 — Captions, Events and source readers

- [ ] Replace seen-ID-only caption admission with revision-aware updates of one existing utterance entry. Preserve displayed/read chunks, stable layout identity, selection and current reading progress against permitted speech content, not placeholder prose or repartitioned chunk indexes. Hold the last provisional grapheme boundary; placeholder reading consumes no future quotation. One suffix creates no new queue slot/missed-caption count.
- [ ] Keep a fitted open caption readable without unbounded transient retention, use existing chunking/priority/overflow policies, and finish with an ordinary terminal reading interval. Hidden/pause/deferred expiry and dismissed identities follow the technical design exactly.
- [ ] Update loaded Events/history/source rows in place from scoped received bodies, merge newer overlapping page results, and preserve scroll, details, filter and source-comparison selections. No page refetch or full transcript rerender per part.
- [ ] Provide neutral interrupted status outside quoted words, avoid fabricated error speech, preserve unknown/sound-only presentation and announce newly readable content at meaningful passage boundaries without repeating old text per part.

**Exit:** Q05/Q07/Q13 pass focused browser journeys for multiple listeners/captions, narrow layout, selection, pause/document hide, accessibility announcements, overflow, active row updates and reconnect. The retired player Talk transcript stays retired.

## NST09 — Integrated qualification and enablement evidence

- [ ] Run the technical design's Q01–Q13 matrix with deterministic providers/failure injection, real supported persistence and the affected browser journeys. Record exact source revision, environment, fixtures and known gaps in one focused verification report.
- [ ] Measure one shared reply to 10, 20 and 50 eligible connected players, plus mixed clear/partial/sound-only evidence, a slow socket, reconnect churn and an utterance outliving recent-tail turnover. Assert one provider request and inspect actual persistence/projection/egress work.
- [ ] Exercise all current public provider/caller routes with independently authorized live calls as required, preserving complete known/uncertain costs. Qualify first useful public text, meaningful output admission, quality, cancellation, incomplete output and same-Run recovery. A mock is not live latency or content-safety evidence.
- [ ] Record route-by-route enabled/disabled/completed-output-only disposition. Complete applicable PD07/PD08 requirements before external player use; retain existing broader capacity/release gates honestly.

**Exit:** no unsatisfied selected-scope acceptance is hidden behind a green parser test. Measured results establish only their actual workload. Broader AI concurrency/production capacity and optional media stay with their current owners.

## NST10 — Coordinated cutover and maintained completion

- [ ] Review domain, provider, server, protocol, persistence and UI together for alternate schemas, stale callers, untracked callbacks, open semantic leaks and duplicate authoritative state. Remove obsolete public-NPC private-preview attachment without erasing historical NP05 evidence or unrelated caller work.
- [ ] Reconcile canonical specs, limits and this tracker with actual delivered behavior; add exact verification evidence. Keep unresolved route/release acceptance open instead of declaring it measured.
- [ ] Follow repository verification/review guidance, format changed documents and check links. When the selected project is fully implemented and qualified, update status tables and move the paired project documents to `projects/completed/` with repaired links.

**Exit:** one supported current contract, reviewed evidence and accurate completion status. NST00 being checked does not authorize checking NST01–NST10 from this documentation task.
