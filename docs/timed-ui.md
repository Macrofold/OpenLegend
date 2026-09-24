# Timed UI and remaining-time indicators

## Status and ownership

Accepted presentation contract; current components and limitations are recorded in [Architecture](architecture.md#hearing-captions-and-perceived-events). This document owns reusable lifetime sampling and visual progress/remaining-time indicators. [Hearing and speech](hearing-and-speech.md) is the first caption consumer. Native work, cooldowns, game effects, and provider jobs keep their own authoritative owners. Implementation staging belongs in [the hearing tracker](maintainers/hearing-and-speech.md); deferred automated coverage belongs in [TODO](maintainers/TODO.md#hearing-captions-and-perceived-events--deferred-validation).

## 1. Two small reusable pieces

Build a pure `ProgressRing` visual component and a small presentation lifetime utility. Do not create a universal world-timer service, an animation framework, or another scheduler.

`ProgressRing` accepts a finite clamped fraction, accessible-label/semantics options, size, and visual direction. Its first use is remaining fraction: full at appearance, empty at expiry. A work consumer may use elapsed fraction instead. The component does not know about speech, cooldown admission, dates, save files, actors, model calls or expiration effects.

A presentation lifetime stores its duration and elapsed active reading time, sampled against an injected monotonic presentation clock. Queued captions and active captions that have not yet fitted into the layout have not started their reading lifetime. Start on first visible placement; temporarily hidden or displaced labels preserve the unconsumed reading budget. Hidden labels must not reserve collision space for other labels. An illustrative boundary is:

```ts
type LifetimeSnapshot = {
  state: 'queued' | 'running' | 'paused' | 'expired';
  remainingMs: number;
  remainingFraction: number;
};

// Inputs are explicit; no ambient clock inside shared domain code.
sampleLifetime(lifetime, nowMs): LifetimeSnapshot;
```

The implementation may use deadline-plus-paused-offset or elapsed-time accumulation, not both independently writable. One overlay manager owns its clock and active entries. Resume preserves remaining time rather than restarting the ring. Rendering must not itself commit the expiry transition repeatedly.

Unknown duration is not a fake countdown. Keep the existing indeterminate AI dots/spinner for unknown provider work. A zero duration is already expired; reject invalid negative/nonfinite durations at construction. An intentionally persistent caption has no countdown ring.

## 2. Explicit clock domains

| Consumer | Time authority | Consequence of reaching the end |
| --- | --- | --- |
| Speech caption or toast | Local active reading time | Remove presentation only |
| Native work progress | Projected server simulation clock/progress | Server confirms completion; UI cannot execute work |
| Gameplay cooldown/effect | Its native authoritative simulation deadline | Owning native mechanic decides availability/effect |
| Real-world deadline | Explicit server/wall-clock deadline | Owning service decides outcome |
| Unknown provider duration | No determinate clock | Show non-numeric pending status |

For captions, one real second of active reading time advances one presentation second, regardless of 0.5×/1×/3×/8× simulation speed or the world's minutes-per-second ratio. Freeze active caption time while the game is manually paused or the document is hidden. Existing captions resume with their remaining reading budget; new historical events accumulated in a hidden tab are not queued for an old-speech avalanche.

Provide a presentation-only pause/hide preference and reading-time multiplier. A persistent World Events history is the untimed source for missed text. Pause presentation must not pause NPC cognition, change actor hearing, or cancel native effects. Conversely, a generic ring reused for a game effect must not inherit caption-specific pause-on-hidden behavior.

A consumer may separately bound how long deferred presentation stays relevant. [Speech queue residence](hearing-and-speech.md#7-caption-component-and-lifetime) uses the same presentation clock, but discarding a stale queued item does not pretend its reading ring reached zero or trigger a gameplay effect.

No caption timer is persisted in WorldState or used for acoustic duration. Restore/world/control changes clear these local presentation lifetimes. History remains authoritative about what occurred and what the listener perceived.

## 3. Appearance and accessibility

For speech, use a 12–14 CSS px diameter with a thin approximately 1.5–2 px stroke, to the right of the last text line; wrap below when needed. Use normal design tokens and sufficient contrast. Avoid numbers, flashing, pulses, or a second circular container by default. The ring represents time remaining to read the current caption chunk, not how long the speaker will keep speaking.

A passive caption's ring is decorative to assistive technology (`aria-hidden`); announce the new caption once through the existing accessible text path. Do not announce fractions every animation frame. A consumer with meaningful task progress may supply progressbar semantics and throttled values separately. A tiny indicator is not a tiny required click target: any pause/dismiss/history action gets a normal keyboard-accessible control.

Reduced motion stops continuous animated depletion; show a restrained static indicator or coarse stepped remaining state without announcing repeated changes. The lifetime may still elapse unless reading is paused. Caption text remains available in World Events. Offer global pause/hide controls rather than depending on hover-only pausing.

## 4. Rendering and cleanup

Reuse the existing scene frame callback for active world overlays and one manager-level clock. Do not allocate an interval or timeout per caption. The owner removes an expired item once and advances any queue. No global React HUD rerender is needed per frame; update only overlay positions and indicator drawing as appropriate, with text/layout changed only when entries change.

Remove animation subscriptions, component roots and local queues on unmount/disposal. Bound active and queued entries at the consumer, not in the generic progress component. Lifetime disposal never deletes a world event or cancels a gameplay action.

Start by sharing the pure fraction/ring and lifetime helper for speech. Adapt existing work indicators only where this removes real duplication without changing their continuous-bar appearance, server clock, or completion semantics. The quick-action bar's cooldown-ring rule remains specific to that bar.

## Reference basis

[W3C Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) explains persistent untimed alternatives; [Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) motivates control of parallel automatic updates. These are design considerations, not a declaration of complete accessibility conformance.
