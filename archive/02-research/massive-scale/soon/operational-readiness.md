# SOON: release readiness before public persistence

[Research index](../README.md) · A proposed evidence checklist for D5 and existing subsystem gates. No item is asserted complete here.

## Choose the promise before testing it

Define supported devices/browsers, regions, world occupancy, active-agent workload, allowed simulated speeds, retention, reconnect behavior and recovery objectives. State whether a world is persistent while empty and which progress can be lost after a crash.

Separate native action responsiveness from generated dialogue latency. A slow model does not excuse unresponsive walking. Separate browser first-playable time from warm steady-state frame rate. Separate a database's availability from the ability to recover correct gameplay.

The [benchmark plan](../benchmark-plan.md) gives the experiments; this page describes the evidence needed for a public promise.

## Release gates

| Gate | Required evidence |
|---|---|
| Identity and privacy | Two-player control isolation; denied creator actions; private history/recall/media inaccessible through modified clients |
| Native integrity | Contested resource use, collision/support and required acquisition remain correct under load |
| Durability | Lost acknowledgment and restart do not duplicate accepted effects; declared routine-progress window is measured |
| Recovery | Empty-target restore recovers content pins, ownership, minds, obligations and required erasure overlays |
| Async execution | Timeout, cancellation, malformed output and late return do not corrupt the world or duplicate accepted spend/effects |
| Browser/network | Supported devices remain usable under representative latency, jitter, bandwidth and reconnect scenarios |
| Overload | Bounded queues and safe admission; no hidden evidence loss or unapproved change of world laws |
| Cost | Measured player/world-hour distributions, quota enforcement and runaway-spend containment |
| Deployment | Compatible rolling update or explicit drain/restart; old clients and pending jobs handled intentionally |
| Support | Runbooks, alerts, audit access, user-facing incident states and accountable operators |

Numerical thresholds should be agreed before the qualification run. Suggested initial experiments may use conservative headroom, but this report does not relax the existing native cadence or invent a public SLA.

## Three mandatory drills

**Owner death during shared activity.** Kill the process around a resource transfer and after a durable commit but before acknowledgment. Restart and retry. Check unique ownership and receipt continuity.

**Dependency degradation.** Add database delay and fail the inference provider. Observe queue ages, native progress, required evidence, admission and UI. Confirm recovery does not release a burst of stale proposals into a changed world.

**Restoration and revocation.** Restore an older save after a memory correction and permission revocation. Check cold search, summaries, narration, audio URLs and reconnect behavior. No derivative should bypass the current restriction.

Run fault tests in disposable environments with controlled data. They are not authorization to disrupt a live world or call paid providers at scale.

## Security and governance sign-off

Review ordinary/player/creator/operator role separation, origin/session handling, API payload limits, prompt-injection boundaries, asset validation and private telemetry access. User-generated content, minors, recordings, retention and regional processing need explicit policies and appropriate professional review before public launch.

A policy document alone is not implementation evidence. Test the controls and access paths it depends on. Keep the evidence restricted where it contains private data.

## Release and expansion decision

Expand when the full workload passes with repeatable headroom and operational recovery, not merely when a short CPU test passes. If only some dimensions are qualified, state the envelope: for example, tested world population and density at a specific speed with a bounded active process mix.

Preserve uncertainty. An untested million-record history or a concentrated crowd remains an open capacity question even if a thousand independent small worlds run well. Carry those limits into placement/admission rather than relying on optimistic average load.
