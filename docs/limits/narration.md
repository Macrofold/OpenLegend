# Narration and conversations: limits and constraints

[Feature contract](../narration-and-conversations.md) · [Implementation work](../maintainers/narration-and-conversations.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [story-selection.ts](../../packages/domain/src/story-selection.ts).

Private NPC preview constraints are owned by [NPV01](interface.md#npv01--private-npc-reply-preview). Provisional Talk text does not enter speech, memory, caption or conversation records; these still require final native admission and actual listener projection. [NP05 evidence](../verification/npc-reply-preview.md) distinguishes private early reading from committed speech. No narration retention or audience policy changed.

## Selected DG15 product proposal

[After you left](../projects/story-perspectives-feature-spec.md) proposes one optional historical external perspective. SP01–SP08 are unimplemented product choices; they do not change the current LA/NR baseline below. [NC20](../maintainers/narration-and-conversations.md#nc20--optional-after-you-left-perspective) owns the consumer through existing NC execution, privacy and history work. Correct source authority and accounting are invariants, not limits that may be relaxed to obtain more stories.

## SP01 — Selected external perspective

**Proposed; Very safe.** Off by default; one human account in the world's entire participant/spectator history, one controlled character, one familiar resident, one already perceived campfire scene and one already witnessed native cord-making family. The authored camp radius is eight metres. One subsequent external completion may be disclosed under a new explicit world/reader grant. No speech, private internal material, another human, new recipe, current inventory/position or distant tactical opportunity is admitted. Public-looking geometry and narrative importance do not grant access. This narrow profile limits disclosure work and tests a modest continuation payoff; it is not a universal story policy. [World profile](../worlds/base/story-perspectives.md).

## SP02 — Capture and unrequested scene

**Proposed; Safe.** One active departure anchor and one latest unrequested scene per reader/world; one captured completion per witnessed activity anchor. The source window lasts at most one game hour after actual departure and closes on re-entry, first capture, replacement or permission loss. Captured candidates last at most seven real days and may be replaced by later eligible ones without generating a backlog. These are new candidate-storage policies, distinct from ordinary automatic narration. For this mode alone, seven days replaces original-occurrence freshness; timestamps remain historical. A new request is declined before dispatch when execution cannot proceed, not left in another waiting queue. The short source window preserves a recognizable episode and the longer reading window avoids immediate-attention pressure; useful availability is unqualified.

## SP03 — Optional request frequency and priority

**Proposed; Safe.** At most four dispatched glimpse attempts per authenticated human account across worlds in a rolling twenty-four real hours. Dispatched failure/cancellation counts; pre-dispatch refusal does not. Restore, new worlds, voice changes and reconnect cannot reset real-account attempt accounting. Existing funding can stop work earlier. Use the existing single queued/running narration slot with lower optional priority, no automatic paid retry or secondary generation queue. Optional work does not consume ordinary cooldown or introduction milestones; the new cancellation/priority behavior requires NC qualification. Four is a conservative request-count ceiling, not a dollar estimate, daily goal or monetized bypass. Revisit only from useful-reading and interference evidence.

## SP04 — Source and prose envelope

**Proposed; Safe.** One primary occurrence with at most two necessary supporting references; at most 8,000 UTF-8 bytes in the complete retained permitted scene projection. No ordinary personal background is added. One bounded Narrator call yields one to three sentences, at most 500 characters each and 1,200 characters total, within the existing 24,000-byte complete input and 1,800-token output allowance. No minimum prose length. Mandatory facts that do not fit cause refusal, not selective omission; invalid generated text follows NR01. These smaller envelopes contain source review and prose cost. They do not justify reducing any required actor context or prove semantic entailment.

## SP05 — Readable historical presentation

**Proposed; Very safe.** Text-only first presentation in the private Journal; no automatic banners, push reminders, ungenerated unread count, camera move, map pin, remote controls, voiced scene or gameplay reward. Published permitted text has no reading/dismissal timer. Occurrence time and the human/character distinction remain visible. World time and actual needs/danger continue under their existing rules. This gives voluntary reading a small attention footprint; fuller cinematic presentation requires its own demonstrated benefit.

## SP06 — Preference and cancellation scope

**Proposed; Very safe.** Off clears the active anchor and unrequested candidate, stops future capture and cancels pending publication, while preserving valid published entries. On requires a fresh witnessed activity; closing the Journal alone may allow the same already-requested authorized entry to finish privately. Adding a second ordinary human participant or spectator closes the profile before their world access is granted. No abandoned request is automatically resent. These are explicitly new stronger lifecycle requirements; existing source-revision checks alone do not satisfy them.

## SP07 — Source retention and correction

**Proposed; Safe.** Retain only the permitted scene projection and minimum source support; no full private transcript, hidden inventory or NPC biography. Correction/revocation must invalidate derived prose and all reader-facing routes under existing NC/privacy rules. A compact but valid source may continue supporting history; missing evidence cannot be reconstructed from current state. No automatic generation repairs a withdrawal. This retains enough provenance to explain a true historical sentence without secretly retaining excluded material.

## SP08 — Published history and expansion

**Proposed; Medium; lifetime capacity unqualified.** No new automatic expiry or numerical lifetime cap is imposed on already published private Journal entries by DG15; existing NC history, source privacy and recovery policies remain controlling. One-candidate retention and bounded generation limit new additions but do not prove lifetime query or storage capacity. History is not advertised as unlimited free storage. Shared exports, other source families, additional humans and private internal perspectives remain separate selected work, not an automatic scope escalation when the first scene is dull.

## JP01 — Selected personal export profile

**Proposed; Very safe.** DG16 initially permits only ordinary actor-perspective Journal text whose sources are the requester's own participation and supported NPC/world occurrences, with current viewing and personal-export permission established. Other-human contributions or uncertain source participation, raw conversation/history, private thoughts, DG15 cutaways and media are excluded. Exclusion is explained safely, without disclosing hidden source facts; names or private-row ownership are not eligibility proof. This is a deliberately narrow first useful edition, not a permanent ban on permissioned shared editions. [Product owner](../projects/personal-journal-feature-spec.md#32-initial-eligibility); [NC21](../maintainers/narration-and-conversations.md#nc21--personal-journal-edition).

## JP02 — Authorship and format

**Proposed; Medium.** Explicitly selected entries remain in original chronological order; original narration is not rewritten. Optional title and per-entry personal notes are clearly attributed. First outputs are PDF and plain text with identical selected words and order, no embedded art, audio, remote resources or private internal identifiers. No new AI generation, automatic important-moment selection, writing reward or public distribution occurs. The restriction keeps an understandable readable copy complete without a publishing platform. Accessible PDF and text must be qualified, not assumed from format.

## JP03 — Edition and draft envelope

**Proposed; Safe; unmeasured initial envelope.** One edition contains at most 100 selected entries and 256 KiB of combined UTF-8 original text, title, notes and attribution before layout. A title has at most 120 Unicode characters; each note at most 2,000. Selection records and document generation have finite separately qualified resource bounds before implementation; the textual envelope is not a proof of bounded source traversal or PDF heap use. Preserve whole entries and draft input on overflow, explain the binding limit and let the player reduce the edition. Never silently truncate or replace a long entry. These values admit a substantial short personal edition while bounding optional work; increase only for a wanted use with measured source/layout cost.

## JP04 — Draft and prepared-file retention

**Proposed; Medium.** One explicitly saved current draft per account/world/controlled-character scope; it stores source references, title and personal notes, not copied original narration. Replacing/discarding it is deliberate. No new automatic age expiry or hosted edition archive is added. Current-world/account growth can still create more scopes: no independently qualified total storage allowance is claimed, and deployment must account for this dimension under existing data/retention owners before offering it. Prepared files exist only for the active authorized preview and are released on close, replacement or invalidation. Explicit deletion, source erasure and privacy policies remain controlling.

## JP05 — Preparation and changed-source behavior

**Proposed; Safe.** One active preparation per current edition; duplicate actions do not add a queue. Bounded scoped selection precedes full content/source preparation. Changes invalidate preview; all selected content and use rights are rechecked before release. A correction needs review, and a revoked source cannot survive in service-controlled output. Missing content or conversion failure is explicit; text download is a deliberate alternative. Optional export cannot block ordinary play or create an unbounded history scan. No scan, queue, latency or PDF output-byte figure is asserted as measured; technical qualification must choose and verify finite operating bounds.

## JP06 — Copies and omitted expansion

**Proposed; Very safe for expansion scope.** A download is a historical personal copy, with no remote recall, automatic correction, restore/import or unlimited-service promise. No new edition sharing, other-human consent workflow, real-life reflection, art inclusion or print ordering is selected. The service explains that its erasure cannot delete an already downloaded external copy. This is an honest boundary of control, not a relaxation of current in-service erasure or permission enforcement.

## LA153

**Removed at original audit; not reverified · Restrictiveness: — (removed).**

**Former limit, now removed:** The narration-selection policy permits 16 importance-related fields and 32 rules for deciding which events deserve narration.

**Reason / tradeoff:** Removed the sixteen-field and thirty-two-rule narration ceilings. Supported field/rule shapes, event types and numeric values remain validated.

[Implementation starting point](../../packages/domain/src/story-selection.ts).

Original recommendation: **Completed removals**.

## LA154

**Historical — needs recheck · Restrictiveness: Medium.**

Narration-selection fields and numeric comparisons use values within ±1,000, and event significance uses a 0–10 scale.

**Reason / tradeoff:** Keep meaningful numeric validation, but treat the chosen scoring ranges as narration-policy design.

[Implementation starting point](../../packages/domain/src/story-selection.ts).

Original recommendation: **Review**.

## LA155

**Historical — needs recheck · Restrictiveness: Medium.**

The default narration policy introduces an entity when its configured story-importance value reaches 7.

**Reason / tradeoff:** Review whether this produces useful introductions rather than assuming seven is a technical requirement.

[Implementation starting point](../../packages/domain/src/story-selection.ts).

Original recommendation: **Review**.

## LA156

**Historical — needs recheck · Restrictiveness: Safe.**

One narration request groups 8 mandatory source events by default, configurable from 1 to 16.

**Reason / tradeoff:** Keep narration requests focused and split additional events into suitable requests rather than silently losing the events.

[Implementation starting point](../../packages/domain/src/story-selection.ts).

Original recommendation: **Keep**.

## LA157

**Historical — needs recheck · Restrictiveness: Safe.**

Narration delivery defaults to a 300-game-second minimum interval and a 600-game-second maximum event age, with configured durations capped at one day.

**Reason / tradeoff:** Review narration frequency and stale-event handling as player-experience decisions.

[Implementation starting point](../../packages/domain/src/story-selection.ts).

Original recommendation: **Review**.

## LA158

**Historical — needs recheck · Restrictiveness: Very safe.**

A narration request looks at 12 recent source records and adds at most 8 as optional background information.

**Reason / tradeoff:** Keep a focused background selection provisionally, but check whether missing earlier events make the narration misleading.

[Implementation starting point](../../packages/domain/src/story-selection.ts).

Original recommendation: **Keep**.

## LA159

**Historical — needs recheck · Restrictiveness: Safe.**

The assembled information for one narration-model request may contain at most 24,000 bytes.

**Reason / tradeoff:** Keep a request-size limit that matches the selected narration model and preserves the events the narration must explain.

[Implementation starting point](../../packages/domain/src/story-selection.ts).

Original recommendation: **Review**.

## LA160

**Historical — needs recheck · Restrictiveness: Safe.**

A narration-model response can contain 1–6 text entries, each at most 500 characters and citing 1–16 source events.

**Reason / tradeoff:** Expand the response format where useful while requiring generated narration to remain supported by the cited events.

[Implementation starting point](../../packages/domain/src/story-selection.ts).

Original recommendation: **Expand**.

## LA161

**Historical — needs recheck · Restrictiveness: Safe.**

The combined narration text is rejected if it exceeds 2,400 characters.

**Reason / tradeoff:** Align the combined limit with the allowed individual entries so otherwise valid narration is not rejected unexpectedly.

[Implementation starting point](../../packages/domain/src/story-selection.ts).

Original recommendation: **Expand**.

## LA162

**Historical — needs recheck · Restrictiveness: Safe.**

Narration waits 750 milliseconds by default to group nearby events; configuration allows 0–10,000 milliseconds.

**Reason / tradeoff:** Keep a short grouping delay to reduce redundant narration calls without unnecessarily delaying important messages.

[Implementation starting point](../../packages/domain/src/story-selection.ts).

Original recommendation: **Keep**.

## LA180

**Historical — needs recheck · Restrictiveness: Safe.**

The browser reports presence every 5 seconds; conversations expire from inactivity after 1,800 seconds by default, configurable from 60 to 86,400.

**Reason / tradeoff:** Review connection traffic and conversation lifetime separately so a useful conversation does not end merely because a timing default is too short.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Review**.

## LA181

**Historical — needs recheck · Restrictiveness: Safe.**

A disconnected conversation gets 60 seconds of grace by default, configurable from 5 to 600 seconds.

**Reason / tradeoff:** Keep time for brief reconnects while ensuring abandoned conversations eventually close.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Review**.

## LA234

**Historical — needs recheck · Restrictiveness: Safe.**

The narration-generation call allows 1,800 output tokens.

**Reason / tradeoff:** Allow enough room for the narration format the game accepts, while reserving the model cost in advance.

[Implementation starting point](../../apps/server/src/ai-director.ts).

Original recommendation: **Expand**.

## LA235

**Historical — needs recheck · Restrictiveness: Medium.**

One editor request can update values used to decide which events deserve narration on at most 100 entities.

**Reason / tradeoff:** Expand editor capacity when useful while validating and saving the requested changes consistently.

[Implementation starting point](../../apps/server/src/ai-director.ts).

Original recommendation: **Expand**.

## NR01 — Narration failure and regeneration

**Current · Restrictiveness: Very safe.**

Player history and standalone narration show “Narration failed.” on generation failure;
they do not substitute descriptions or offer Regenerate narration. No failure or restart
automatically retries generation. The existing explicit API remains available to authorized
callers, with its source checks, revision identity and accounting fences.

**Reason / tradeoff:** The September 27, 2026 product decision removes the player retry
control and fallback prose so a failed generation is explicit and causes no hidden spending.
It sacrifices an in-game regeneration shortcut; original evidence and actual impacts remain
saved. Deterministic conversation lifecycle notices are not generation failures.

[Contract](../narration-and-conversations.md#9-triggers-ordering-and-transcript-reconstruction) ·
[Implementation work](../maintainers/narration-and-conversations.md) ·
[Plan](../projects/narration-failure-cleanup.md).

## LA236

**Implemented request policy · Restrictiveness: Safe.**

Model-facing conversation is limited to the smaller of 24,000 UTF-8 bytes and the remaining complete decision allowance after mandatory context/action reserve. The older summary gets at most 6,000 bytes (at most one quarter of the conversation allowance); 512 bytes are reserved for presentation overhead before retaining the newest contiguous verbatim suffix. The independent current trigger remains exact. The complete decision retains its existing 100,000-byte admission boundary. These constants are private to `apps/server/src/conversation-context.ts`, not fictional memory rules.

Each compactor input adds at most 24,000 serialized bytes of newly aged-out dialogue to the previous summary and rubric; output is limited to 4,096 tokens and validated against the summary byte allowance. At most eight calls may prepare one decision. An oversized individual turn or cold backlog requiring more calls fails before compaction dispatch; insufficient allowance, invalid/oversized output, cancellation or stale sources fail explicitly without silently omitting speech or automatically retrying. This bounds synchronous rebuild cost; it does not guarantee that every retained conversation can be rebuilt in one decision.

Conversation metadata admission retains the existing 8,192-row boundary, and uncovered source bodies retain the 4-MiB hydration boundary. Warm preparation avoids covered bodies but still validates the eligible metadata prefix. A source publication racing a validation read permits one additional metadata read; a second unstable read fails explicitly before downstream generation/publication. This is bounded native validation, not a paid retry. SQL may examine more rows than it returns; this is not a lifetime-history-independent latency guarantee. Durable conversation history has no new turn cutoff. One derived row is kept per world/actor/conversation; cache count has no separate lifetime cap and grows with conversations, while restore clears world caches and corrections/forgetting/awareness edits clear affected actors' caches.

**Reason / tradeoff:** Bound model context and paid cold preparation while preserving durable evidence and actor hearing. The initial split leaves most space for recent exact wording and favors recall within the older summary. Live qualification rejected nano cleanup after drift and the mini route after invented disagreements in overheard dialogue; it uses the configured complex reasoning route at low effort. Rolling prose can still lose detail; repeated old-topic or attribution failures are the trigger to evaluate source-backed segments/retrieval behind the existing owner, not to widen disclosure or hide missing evidence. These are initial qualified examples, not optimal allocations or universal model-quality guarantees.

**Assessment:** Keep the bounded projection; tune the split/model from continuity traces. Expand cold rebuild only with a bounded continuation strategy and spending evidence. There was no prior runtime compaction allocation to remove; the earlier full-transcript admission failure is replaced by on-demand compaction, with explicit capacity failures retained.

[Canonical behavior](../narration-and-conversations.md#model-facing-conversation-compaction) · [Design](../projects/conversation-compaction-tech-design.md) · [Evidence](../verification/conversation-compaction.md#conversation-compaction) · [NC14–NC17](../maintainers/narration-and-conversations.md).
