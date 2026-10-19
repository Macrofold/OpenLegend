# Shared NPC speech streaming limits

[Feature specification](../projects/npc-speech-streaming-feature-spec.md) · [Technical design](../projects/npc-speech-streaming-tech-design.md) · [Implementation](../maintainers/npc-speech-streaming.md) · [Tracking rules](README.md)

All NST entries are **Proposed — accepted design, implementation/qualification pending**, October 18, 2026. Existing code bounds cited below were source-inspected at `d261c94f50875edd88e8eb4a69cf8f4a413563cb`; they are not new capacity measurements. These choices do not change provider spending, simulation speed, player capacity or production enablement.

## NST-L01 — One fixed public occurrence

**Restrictiveness: High — deliberate product scope.** One utterance fixes its complete hearing audience, attribution and delivery at first durable text acceptance. It can append approved text until one terminal closure. No physical speech duration, naturally paced rendering, later arrivals, per-part hearing, movement/door interruption or environmental resampling is included. Original listeners retain the remainder after ordinary movement; current access/forgetting/timeline revocation still wins. The native audience has **no new listener cap**: growing detection, projection and stored perspectives follow [HR02](hearing-and-speech.md#hr02--complete-audience-and-partial-evidence), never sampling. Mike selected this simple immediate-text scope. Further timed/media behavior requires its separate design, not a change to a batching constant.

## NST-L02 — Structured parts and aggregate output

**Restrictiveness: Medium — reuses existing utterance/response limits.** Preserve 16 logical response operations, the generated speech raw aggregate of **1,200 UTF-16 code units per utterance**, and the existing **40,000 UTF-8-byte normalized logical-response** allowance. Preserve the selected caller's total decoded decision JSON/provider wire bounds, including the existing 1,000,000 decoded-byte decision ceiling and separately admitted invention allowance where applicable; record encoding receives no fresh allowance per part. Native speech's 1,500 and player input's 1,000 character limits remain in [HR02](hearing-and-speech.md#hr02--complete-audience-and-partial-evidence). The exact implementation must use each owner's actual counting unit, not equate bytes, code units and graphemes.

Every `speech_text` record is nonempty and counts toward its utterance's raw aggregate before canonical trimming. There is **no separate arbitrary part-count or minimum phrase-length cap**: the aggregate already permits at most 1,200 nonempty text records per utterance and at most 19,232 records for sixteen all-speech operations including their starts/ends, with byte limits usually tighter. Only one candidate start/text/end sequence is being assembled at a time; at most sixteen sealed utterances can await one attempt's terminal. Preserve parser depth 32, 256 object keys and the appropriate transport frame/total-byte limits already owned by [NPV01](interface.md#npv01--private-npc-reply-preview) and [AI execution](ai-execution.md). Reuse their implementation constants; do not duplicate private-preview scheduling or eligibility policy.

Prompts request short coherent literal passages; that is a generation instruction, not a guarantee or a new native speech limit. Exceeding a raw/text/record-structure bound interrupts admission, preserves accepted words and rejects the unaccepted remainder. Do not truncate a surrogate, silently crop output, reset an allowance on each record or queue an unbounded number of asynchronous callbacks. The exact record interpreter is in the technical design.

## NST-L03 — Durable batching cadence

**Restrictiveness: Low — selected conservative initial scheduling value, unmeasured.** The first approved passage may commit immediately when the existing writer is available. Subsequent ready suffixes coalesce on a **250 ms continuation start window per publication attempt**; terminal flush does not wait for that window. This borrows the retained private-preview cadence as an initial engineering choice and avoids one durable write per provider token. It is not a speaking rate, minimum display delay, write-throughput claim or hard end-to-end latency guarantee.

Keep one bounded cumulative pending suffix per admitted utterance, one active admission task and one scheduled wake per attempt. New work merges into that state instead of adding another pending write. The existing game SSE publication-start window (50 ms, with nominal 8 ms projection yields) remains in its delivery owner. Storage, screening, scheduling and network time are measured separately. Change 250 ms only against useful-first-text, continuation-stall and full write/load evidence in NST09; do not add per-listener timers or silently coalesce forever.

## NST-L04 — Meaningful approved passages and operation barriers

**Restrictiveness: High — content and ordering integrity.** A complete typed header, exact current publication claim, meaningful passage screening and durable storage all precede public text. A gate may approve, hold or stop the bounded candidate; uncertain/unavailable screening exposes no suffix. Unqualified routes remain completed-output-only, subject to the same output checks and [PD07](../maintainers/production-deployment.md#adult-content-and-companion-safety-release-requirements).

Only a leading sequence of admitted speech operations can publish before complete-response validation. The first non-speech operation or unresolved dependency blocks all later early publication; the final native ordered drain resolves it. No early action execution, reordered speech, per-listener screening request or automatic paid repair is introduced. This deliberately accepts less early text for mixed responses to retain existing action/decision ownership.

## NST-L05 — Stable partial hearing

**Restrictiveness: Medium — selected approximation with conservative latency.** Replace whole-utterance-dependent masking for the current speech format with the pinned incremental island/pair policy specified in the technical design. One lexical unit from each pair is heard; a terminal singleton is deterministically heard or hidden. Coalesce hidden runs. Seal only complete robust whitespace-delimited islands; an unspaced or unusual Unicode tail may wait until closure. No approximate lexical cutoff, chunk-dependent remasking or source-text count is exposed.

The tail is bounded by the same 1,200-unit generated utterance allowance, and actual permitted fragments are persisted. Pinned segmentation runtime/data portability requires qualification; old saved fragments are never recomputed. The approximately-half policy inherently permits coarse inferences from heard words, so the guarantee is absence of **additional exact hidden-source progress/count metadata**, not information-theoretic secrecy. [HR02](hearing-and-speech.md#hr02--complete-audience-and-partial-evidence) remains the owner of full hearing completeness and the physical tier.

## NST-L06 — Terminal semantic eligibility

**Restrictiveness: High — consistency boundary.** Human presentation/history may read open accepted prefixes; semantic/model consumers may not. A terminal ready order from the existing saved native sequence domain makes the closed utterance newly eligible once, even when its original occurrence is older than a considered watermark. This adds no reaction-per-part, new queue or independent scheduler. Interrupted context preserves uncertainty about the missing ending. [Memory limits](memory.md), [Cognition](cognition.md) and [Native work](native-work.md) retain their existing work, retention and budget constraints.

Closed speech and derived history grow with actual occurrences/audiences under the existing retention owner. Streaming adds no semantic index/embedding/summary for each intermediate prefix. Explicit save versions and existing required evidence retention remain; there is no automatic cumulative-prefix archive per batch.

## NST-L07 — Active references and recovery growth

**Restrictiveness: Medium — required bounded live state.** A derived active index retains exact open event/account references independently of the normal latest-60 event view and hot-awareness residency. Its authoritative size is bounded by admitted nonterminal response owners times their existing sixteen logical-operation allowance, plus their complete actual observer audiences. It is not a separately writable speech store and does not cap hearing. Admission must obey existing job/world work bounds; a provider call cannot create an unowned permanent pin.

At closure, currently applicable scoped channels receive the final permitted snapshot through their next normal publication handoff before the delivery pin retires. No connected channel means no delivery pin is needed. Pin retirement does not wait for client acknowledgements or hold a generation slot for a slow socket. Closed handoffs share bounded channel delivery state; reset/history recovers a missed terminal. Revocation clears its pending projection first. Hot/cold storage and observer-index costs must include actual audience growth, not only the short text limit.

## NST-L08 — Existing connection and caption bounds

**Restrictiveness: Medium — reused delivery/display limits.** Reuse `/api/events`, current scoped revision/replay/reset rules and configured shared stream admission; no speech-only connection or broker. At the source baseline, player capacity defaults to 100 and the shared active game/private/pending stream cap is three times that value, hence 300 by default; scoped channel count uses the configured connection allowance. Each channel retains at most 64 encoded patches within 1 MiB and a blocked write times out after 30 seconds. These are current configuration bounds, not multiplayer qualification.

New speech updates are cumulative observer-permitted same-ID snapshots. The current caption owner retains 8 active, 24 pending, 3 total per identified speaker, 160-grapheme display chunks and its existing reading/hidden-expiry policies under [HR04](hearing-and-speech.md#hr04--caption-density-and-lifetime). One growing utterance occupies one caption identity, not one slot per part. Overflow remains history; a sound-only or partial account receives no hidden-source length through reading duration. Reconnects resume currently open permitted speech but do not replay finished captions.

## NST-L09 — Cost and qualification boundary

**Restrictiveness: Medium — honest capability envelope.** Ten, twenty and fifty connected entitled players are required shared-response qualification cases, not an adopted maximum or demonstrated capacity. One original generated response still makes one admitted provider execution; fan-out grows projection, storage and network work. Multiple distinct NPC decisions remain separate budgeted work. Existing AI admission/concurrency and spending limits are unchanged.

Record time to first screened/durable/client-visible words, publication gaps, terminal time, writer and event-loop delay, actual audience size, changed accounts, persisted bytes/writes, patch encoding/egress, bounded live memory and complete known/uncertain provider cost. Slow-client/reconnect churn and long event histories must be included; do not infer capacity from short utterance size or a mock provider's latency. NST09 owns measurements and PD07 owns player-facing enablement. Broader production concurrency, multi-process ownership and timed/audio work retain their independent owners.
