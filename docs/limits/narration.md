# Narration and conversations: limits and constraints

[Feature contract](../narration-and-conversations.md) · [Implementation work](../maintainers/narration-and-conversations.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [story-selection.ts](../../packages/domain/src/story-selection.ts).

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
