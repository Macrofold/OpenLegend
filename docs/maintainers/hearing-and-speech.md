# Hearing, captions and perceived-event delivery

## Scope

HE01–HE04 deliver [hearing and speech](../hearing-and-speech.md), [timed UI](../timed-ui.md) and [Perceived World Events](../perceived-world-events.md). HE05 separates current integration evidence from broader acceptance. This feature uses existing EPR/NC/SW/CR/PF, authority, history and memory owners; it does not introduce another event system or scheduler.

## Current integration

The source `feat/hearing-speech-captions` at `c4379246` is preserved as `codex/hearing-before-main-20260926`. Its final feature tree was consolidated, then rebased in `codex/hearing-ready-for-main` onto main `45210d41`, including native actions and the latest scene/cognition/persistence improvements. `codex/hearing-main-integration` preserves the earlier squash. The [integration plan](../projects/hearing-main-integration.md) and [current evidence](../verification/hearing-main-integration.md) own reconciliation and validation details. That integration did not rewrite remote source history. It is now merged into local main as `61437608`.

Main's elapsed-time integration, scoped authority, relational/cold memory, contribution ownership, placement and renderer remain authoritative. Hearing adds instantaneous emission-state evidence, not a mandatory one-second inner loop or a four-second visual-discovery timer. 8× requests 480 game seconds per wall second at the base ratio; interval counts depend on actual boundaries. See [simulation time](../simulation-time.md) and [joint integration notes](speech-time-integration.md).

Development compatibility follows the [root policy](../../AGENTS.md#development-save-policy). Current-format persistence, restart and restore retain the original listener fragments; historical speech is never remasked.

## September 27 review follow-through

World Events now uses the existing scoped client request helper, including the current tab identity, authority scope, abort signal and rejection of late responses after access changes. Its former direct fetch could fail under OIDC and omitted the client-side scope fence. The crowded browser scene exercised control takeover, walking, captions and the Speech filter. A disposable PostgreSQL lifecycle run preserved exact partial words across restart and rejected unauthorized/expired history reads. [Performance continuation evidence](../verification/three-times-scene-performance.md#hearing-review-continuation-september-27) records the runtime limits; this does not close the broader HE05 gates. Removed the unused old 10 m hearing-radius constant; authored acoustic policy already owns all current hearing calculations. The simpler base-world sighting policy retains hearing's original listener-specific fragments and complete audible audiences.

The requested follow-up review gives HUD measurements one lifecycle owner, includes the clock settings popup, separates caption preferences from scene updates, and keeps unchanged caption measurement subscriptions intact. A manual browser component check exercised three captions, 130% scale, HUD resizing and destruction without errors; it is not full-game keyboard, narrow-layout, modal obstruction or 60 FPS qualification. See the [review evidence](../verification/three-times-scene-performance.md#requested-implementation-review-september-27); HE05 remains open.

The [scale/startup continuation](../verification/three-times-scene-performance.md#startup-scale-and-save-latency--september-27) repairs the shared radio's hidden-input positioning and accidental text-field styling. Full-game selection, keyboard use, reload and caption layout at 130% remain unverified: the browser tool rejected access to the local game URL, so this run could not interact with the panel. Keep HE05 open until that access is restored and the actual control is exercised.

## Delivery order

### HE01 — Acoustic policy and rich exposure

- [x] Pinned air SPL policy, whisper/normal/shout presets, listener floor and clear/partial/no-word/undetected tiers; ordered energy transmission, range-first queries and complete conservative candidate discovery.
- [x] Preserve participation, life, sleep and capability gates, visual-only cues and distinct self-expression. Geometry caches retain useful admitted entries and evaluate overflow exactly.

### HE02 — Speech admission and durable listener evidence

- [x] Carry volume through player/model schemas, native admission, retries, receipts and fallback. Commit one event plus stable listener capsules; intended recipients do not grant acoustic access.
- [x] Use scoped evidence in history, context, recall, Narrator, reaction routing and public projection. Require original intelligible evidence before interactive decisions, including actor-scoped cold hydration from main; never match raw text to recover a trigger.
- [x] Preserve unknown roles during initialization. Reject generic committed-speech text rewrites; retain guarded deletion, importance updates and non-speech edits after hot consolidation.
- [x] Preserve main's durable indexing of eligible memory sources, generation/source revision fences and per-actor attempts. Remove the older parallel speech-only indexer. Linguistic speech alone occupies automatic dialogue and verbatim retention; other cues remain ordinary evidence under main's recall policy.
- [x] Share count/UTF-8/encoded-byte embedding admission. Recheck current evidence at dispatch and enter a fresh mutation turn for derived publication; release the turn before awaiting providers. One denied actor does not starve others. Empty vector batches skip SQL.

### HE03 — Caption and lifetime UI

- [x] Renderer-owned React overlay, semantic speech icon, pure progress ring and real-time presentation clock. Volume controls, hide/pause/reading preferences and reduced-motion progress are delivered.
- [x] Authorized current sprite anchors, coarse listener bearings, neutral fallback, bounded active/pending/per-speaker queues, fitted-visible reading time, chunk counters, deduplication and 60-second hidden residence.
- [x] Scope includes authorization, actor, world, timeline and history epoch. Restore/reconnect/initial history do not replay old captions. Unknown voices never become identified through later visibility.

### HE04 — Comprehensive player World Events

- [x] Read-only panel below Journal with exact-type filters, including all-conversation Speech and receiver-private encounters/contact/body sensations. Private thoughts, plans, diagnostics and narration stay excluded.
- [x] Existing actor perspectives supply indexed keyset pages with a high watermark and scope/filter/epoch-bound cursor. Read responses fence authority and history changes after awaits. Revisions notify only affected observers.
- [x] Aborted stale fetches, immediate keyed clearing, memoized rows and deduplicated older pages. Opening history never acquires evidence or replays captions.

### HE05 — Runtime and performance qualification

- [x] Reconcile main's start/rate/end integration, work admission, physical contact, contribution indexes, immutable publication, authority, durable records and renderer with hearing. Retain supply-ID indexing, prepared predicates, batched evidence and stable bounded sensory caches.
- [x] Retain the independent zero-provider speech-load driver (now disposable PostgreSQL) and cache-overflow driver. Replace obsolete reference/native-slice profiler inputs with main's requested interval and actual progressed-time accounting.
- [x] Complete the focused current integration checks recorded in [the integration evidence](../verification/hearing-main-integration.md). No historical check automatically qualifies the combined tree.
- [ ] Close PF03/PF09/SW08 cold and dense deficits with matched cold/warm and independently offered speech/persistence workloads. Report requested/advanced game time, debt, scheduling lateness, committed counts, population/density and cold tails; never truncate legitimate listeners to make a gate pass.
- [ ] Broaden graphical/accessibility qualification (the crowded review found HUD obstruction; fixed controls/open panels now participate in caption placement and hidden captions preserve reading time; popup/modal overlap still needs qualification): camera projection/floors/occlusion, moving anchors, long utterances and overlapping speakers, reduced motion, zoom/mobile layouts, restore/reconnect and 1×/8× lifetimes. A focused browser observation is not this entire matrix. Reproduce the full-game UI-scale interaction that displaced Settings content without changing the selected radio value; component-level 130% captions passed, but that does not qualify the panel control.
- [ ] Qualify production PostgreSQL query plans, source revocation/restore during asynchronous provider work and strict live-provider volume schema compatibility. Native or counting adapters do not prove model quality or production database capacity.
- [ ] Run required CI under its own authorization. Deferred automated status, geometry, immutable-parent/fork, HE-T01–HE-T07 and SR27–SR31 cases remain in [TODO](TODO.md); implementation/default manual verification does not close them.

Earlier [initial/review records](../verification.md#hearing-runtime-and-performance), [cache review](../verification/hearing-cache-review.md) and [8× continuation](../verification/hearing-8x-continuation.md) remain historical evidence on their pinned trees and hosts. Their one-second/slice assumptions, old 168-diagnostic typing baseline and connector-only recovery workflow are superseded. The abandoned mutable-entity shortcut was never delivered; normal draft isolation remains required.

## Deferred expansion

- [ ] Measure stable-cache population churn before adding aging; admitted entries persist until their map is collected/replaced, and overflow remains exact.
- [ ] Use registry-provided type metadata when an event-family catalogue exists; the current finite menu does not restrict the server's All view.
- [ ] Resolve [D66](../../archive/05-project/open-decisions.md#d66--re-authoring-committed-speech) before implementing dedicated speech re-authoring. Generic text rewrites remain rejected.
- [ ] Add an authorized caption overflow/gap notice through the common EPR/SSE owner. Current bounded queues preserve history but do not display a dropped count or recover every missed live caption.
- [ ] Qualify long open panels before adding DOM windowing. Explicit older-page loading currently accumulates rows without a global DOM cap.
- [ ] Qualify background memory-index fairness, source selection and budget-denial retry behavior at sustained scale under CR/PF; no duplicate speech-specific queue.
- [ ] Apply dispatch/publication and byte-batch qualification to other derived writers, especially invention retrieval, under CR/INV. Oversized optional records need an explicit semantic-chunking policy rather than truncation.
- [ ] Qualify Intl segmentation across heterogeneous runtimes before deterministic replay of newly admitted speech across them. Stored fragments never reroll.

Rooms/portals, frequency bands, physical speech duration/overlap, voice recognition, language comprehension and native noise effects remain deliberately outside v1. [Limits](../limits/hearing-and-speech.md) records current choices and absent bounds; no acceptance checkbox closes merely because code or a specification exists.
