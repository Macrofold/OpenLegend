# Stealth player experience — limits and constraints

[Feature](../projects/stealth-player-experience-feature-spec.md) · [Technical contract](../projects/stealth-player-experience-tech-design.md) · [SPX delivery](../maintainers/stealth-player-experience.md) · [Inventory rules](README.md)

These are **selected design proposals, not implemented or measured optimums**. Updated 2026-10-23. Existing specialist inventories remain the sole owners of movement, sound, gaze, attention, startle and surprise laws. Information authorization, exact life/control binding, current-versus-history separation and atomic admission are correctness obligations, not tunable limits.

## SPX-L01 — Replaceable input traffic and freshness

**Status: Proposed. Restrictiveness: Medium; latency qualification open.** Send direction/gaze changes promptly with at most **20 replaceable updates per real second per controlled input owner**, sharing that allowance rather than allocating 20 independently to each key. Keep **one in-flight replaceable update and one latest pending value**. Discrete actions and prioritized neutral/cancel messages are not delayed by that replaceable-value gate.

A held direction is renewed at a **100 ms heartbeat interval** while input remains eligible; meaningful accepted direction updates also renew it. The server expires held movement after **300 ms without a fresh valid renewal**, using its monotonic transport clock and the next native input boundary. A rejected/old packet never renews freshness. Input-session/gesture sequencing handles release before start acknowledgement or processing; the watchdog is not the primary release mechanism.

**Reason/tradeoff:** twenty changes per second matches the inspected publication ceiling and bounds redundant requests. The short watchdog limits uncontrolled travel after input loss, but high latency/jitter can interrupt legitimate holding. Measure end-to-end control and stop distance at actual pace before accepting it. Increasing the window needs evidence and a clear travel-risk tradeoff; do not hide bad control using client physics, browser timestamp backdating or automatic retry. At debug 3×/8× the same transport gap spans more simulated travel and needs explicit qualification.

This is operational liveness, not a simulation duration. It grants no progress, pause exception or autonomous movement. One active gesture/session per current control owner and a monotonic cancelled-gesture high-water mark bound metadata; no unbounded tombstone history is required. Restore/transfer starts a new scope.

## SPX-L02 — Look steps and supported control scope

**Status: Proposed. Restrictiveness: Medium.** Q/E requests a **15-degree** horizontal orient-once step relative to the accepted physical gaze, through the installed gaze group's constraints. Key repeat is coalesced under SPX-L01, never converted into an extra physical turning rate. On a pending step, further repeat updates the one latest requested direction; it does not queue many future turns. Visible direction controls offer the same step plus an exact permitted point choice.

**Reason/tradeoff:** a modest coarse step supports keyboard-only exploration while pointer/point selection permits precision. Actual turn rate/range, sensory coverage, body-assisted costs and completion belong to B. The preview distinguishes requested and actual gaze; an out-of-range request does not silently turn the body.

The minimum interface covers desktop keyboard/mouse and responsive visible controls. Touch selection/click-to-move and explicit Look/Watch remain possible. Full gamepad profiles, virtual sticks and arbitrary assistive hardware qualification are not selected by this scope; essential decisions still need non-drag/non-hold alternatives.

## SPX-L03 — Historical scene decorations

**Status: Proposed replacement of current implicit faint memory. Restrictiveness: Medium.** Reuse the existing **128-entry maximum** for disposable remembered scene entries ([LA222](interface.md#la222)). A newly demoted eligible marker remains in the active scene for **5 normal-play seconds**, then leaves that scene layer; a pause freezes this simulation-derived age. Opening/pinning historical inspection keeps the record readable independently. Journal/history access follows actual retained knowledge, not this renderer lifetime.

Use hollow labeled location markers by default. Optional frozen silhouettes share the same authorization and bound. No remembered decoration emits light, sound, shadow, animation, collision or current-target data. Entries expire/evict without asserting death, absence or forgetting. Re-observation comes from a new current permission, not renewing a decoration through hidden state.

**Reason/tradeoff:** five seconds gives a short visual handoff from live contact to history without filling the world with apparently present inhabitants. Large bursts can evict old decorations before that interval; preserve a history route. The number and duration need player/readability measurement; neither limits canonical knowledge or permits discarding a required cue. Late packets and corrections use original observation/correction times, never arrival-time freshness.

## SPX-L04 — Cue reading, overflow and retained history

**Status: Proposed integration; reuse existing canonical cue/history owners. Restrictiveness: Medium.** Extend the existing speech/cue presentation rather than creating a second occurrence store. Reuse its currently inventoried caption count, reading lifetime and paging bounds; [hearing and speech](hearing-and-speech.md) and [interface](interface.md) remain their owners. The implementation must inventory any necessary changed caption bound there before claiming completion.

For the added compact Noticed summary, show at most **3 visible transient cue rows** and retain at most **64 pending display references**, backed by authoritative permitted Events/history. These are disposable references, not copied full events or a second history. A new locally relevant acquired injury/danger/urgent warning takes priority over routine chatter; among equal priority use original occurrence/acquisition order. A client cannot assign priority using hidden threat classification.

**Reason/tradeoff:** compact rows keep movement and the world usable; bounded references prevent a long unread burst from becoming an unbounded UI queue. Overflow replaces redundant routine decoration with a readable “More noticed events” link/count only for actually permitted events. Distinct urgent occurrences remain individually reviewable and contribute to that notice; a routine burst cannot erase an urgent unread indication. Do not concatenate incompatible sources or assert exact hidden actor counts.

Reading time is real UI time under existing caption policy, independent of simulation speed and the cue's live/historical state. Reduced motion changes animation, not semantic availability. Screen-reader announcements are queued/coalesced under the same authorized meaning with a reachable full history. Never prolong current-source authority merely to finish reading.

## SPX-L05 — Existing limits retained without new mechanics

**Status: Current owners reused; new integration unqualified. Restrictiveness: As rated by each owner.**

| Existing constraint | G treatment |
| --- | --- |
| Current server stream ceiling of 20 Hz | Publication pacing only. Native senses, gaze, motion, preparation and effects keep their own ordered simulation boundaries. Short acquired cues still reach history. |
| Existing caption listener-origin displacement fallback (0.5 m in inspected scene code) | Retain neutral historical placement once its old directional screen anchor is misleading; no recalculation from hidden source position. Reconcile future C precision in its owner. |
| Hover's 200 ms delay / 80 ms fade ([interface](interface.md)) | Reuse ordinary pointer presentation; loss of permission bypasses fade for live targeting. Reduced motion removes animation. |
| Existing graphics budgets, including 2/8 local light slots | Aesthetic only. Select from current permitted appearance; historical emitters are removed under the new target. No graphics tier changes detection. |
| E's finite method durations/check allowances; B's actual turn rates; C's pace/posture; D/F's effect/preparation laws | Read installed descriptors and current feedback. No duplicate constants or client calculations. |
| Existing ordered event, knowledge/history, caption and native continuation bounds | Retain their semantic owners and truthful partial/incomplete outcomes. No whole-history scan per input or new nearest-N perception cap. |

## SPX-L06 — Remaining workload and qualification limits

**Status: Unqualified. Restrictiveness: Too liberal to claim scale readiness.** No new global population, live-contact or history-retention ceiling is selected. Cost can still grow with genuinely current observer/contact facets, dense acquired events, changing permitted appearance, recipients, baseline size and indexed history pages.

SPX07 must measure complete cold/warm publication, dense change, reconnection, partial visibility, delayed inputs, correction and creator downgrade. Count selected/scanned/hydrated facts, transferred bytes, native work, queue age, retained render resources and cue-to-action latency. Reuse prepared current facts and actual invalidation; page optional reads before hydration. Preserve required observations and coherent native continuation under overload. A bounded caption list or 128 history decorations does not prove bounded upstream work or acceptable frame time.

No latency budget, optimal cue lifetime, supported machine scale or verified accessibility/fun result is asserted. Concrete measured failures should lead to focused adjustments here or in the actual owner, not an untracked “temporary” cap or a new framework.

