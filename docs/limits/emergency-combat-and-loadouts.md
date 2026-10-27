# Emergency combat and loadout limits

**Selected design, not measured runtime capacity.** [Feature](../projects/emergency-combat-and-loadouts-feature-spec.md) · [Technical design](../projects/emergency-combat-and-loadouts-tech-design.md) · [ECL delivery](../maintainers/emergency-combat-and-loadouts.md). The [world profile](../worlds/base/combat-readiness.md) owns fictional values; this inventory owns restrictions, rationale and reconsideration boundaries, not another copy of its tuning table.

## ECL-L01 — Opening time and encounter scope

Use the world profile's base allowance, modifier clamp and quiet-rearm interval, converted once to simulation time. One opportunity belongs to the recipient's life/encounter, shared across attackers. Cancellation/miss/block/zero injury spends an admitted opening; menu/mode/equipment changes and reconnect cannot renew it. Rebinding a held attack never adds an allowance to readiness already extended by that allowance.

Supported directed and accepted pre-release ray threats qualify. Later crossing/interception, released projectiles and environmental harm do not receive retroactive protection. The result is extra physical preparation, not guaranteed visible reaction time, survival or first-damage immunity; no shared slowdown or client-acknowledgement extension.

**Rationale/reconsideration:** first counterplay without perpetual fight stalling or another projectile system. Qualify ordinary/ranged/late-bound/multiple attacks and actual delivery delay; assess feints, separated encounters and the value of the selected quiet interval through ECL08.

## ECL-L02 — Assistance and information

The world explicitly permits an anonymous danger cue when a real targeted player attack begins. Assistance is not character knowledge, native preparedness or a hidden-source targeting grant. A name/direction requires independently permitted attack association, not merely a visible nearby person or private target metadata.

Actual delay is observable, including a point-fire delay that may imply a player was on the ray. **No timing-side-channel secrecy is promised.** Preview/aim/inspection neither activates the gate nor reports its hidden-recipient-dependent duration. Only an otherwise admitted actual attempt can incur it. Do not build fake timing or broaden disclosure to hide this tradeoff.

One expanded top-center region has stable exact action binding and only permitted additional-threat counts. It never closes menus or acts on its own. Unknown source, renewed view and repeated hits cannot accuse a bystander or manufacture a fresh opening. Qualification checks actual protocol disclosure, unavailable retaliation, typing and restored ongoing danger.

## ECL-L03 — Finite defense and protective gear

Shield, Brace and outfit values belong to the world profile and existing shield policy. Both defense sources use the same finite phase/contact/recovery owner; Brace is weaker and melee-only, while the single outfit contributes passive physical protection through the shared impact owner.

No auto-guard, immunity, parry stun, compulsory stamina/Focus meter, armor class, anatomy, durability or sum-every-item rule. Facing, current attachments, contact family and actual phase govern the outcome. Ordinary manufacture obtains the outfit; a preset or depicted armor grants nothing.

Qualify front/rear, melee/projectile, misses, consumed guard, actual recovery, ordinary crafting and shield/outfit composition. Displayed percentages alone do not qualify every native caller. Broader armor variety remains outside this slice.

## ECL-L04 — Equipment transition and preset storage

The world selects one short duration for a complete equipment change, not a timer per item. Old gear remains effective until atomic completion. Walking or a deliberate reaction can replace unfinished work; switching cannot reset recovery. Existing single-item equip behavior retains its own rule.

**No feature-specific loadout-count cap.** Reuse existing preference label/request/storage admission. A failed save preserves prior preferences; never truncate sets silently or promise unlimited storage. A set contains at most one item per occupied nonoverlapping body port, with multi-port items counted once. Saved sets for a changed body can remain unavailable without being deleted.

Exact individualized objects, current carried access and complete desired contents are required. Missing/incompatible/claimed items refuse the whole switch. No same-name substitutes, convenient partial sets, remote retrieval, repairs or healing. Condition is current execution data, not an immutable preset snapshot.

**Growth and work:** stored/listed preferences grow with saved-set count; list preparation is O(number of sets plus displayed entries) when opened/edited, not per frame. Selected-set admission visits selected/displaced items, occupied ports and affected existing ancestors. No all-world scan, unrelated nested-bag enumeration or all-preset availability refresh. Existing transport/storage bounds remain their owners' responsibility; if actual personal-list growth warrants paging, add it there rather than a new service or an arbitrary gameplay cap.

## ECL-L05 — Automatic action and user control

At most one automatic equipment attempt per true off→on mode entry and one unsubmitted selection in current foreground scope. Default is None. Explicit mode entry/manual Equip may replace work; automatic assault/own-offense notice may not. Emergency Defend/Retaliate uses current gear first and may carry that same pending selection behind confirmed action/recovery.

Ordinary new movement/attack, manual gear, mode exit or blur/pause/disconnect/scope loss clears the pending convenience. Refusal/decline clears it; unknown result/review blocks it. Canceling an already admitted automatic set spends that entry attempt. No retry queue, forced interruption of newer work, exit set or reconnect replay. Manual Equip remains available.

Retaliate requires the displayed source still to be equipped at admission; ordinary auto-equip must not restore a stale weapon after concurrent switching. Existing lethal review remains required, so that case is not promised to attack with one unqualified click. Qualify these orderings through actual native calls, not UI flags alone.

## ECL-L06 — Interaction and acceptance boundaries

Preserve existing right-click/context/camera ownership. New Defend and loadout shortcuts are named/remappable but initially unassigned; visible keyboard-operable controls are complete. Text/IME and genuine authority-blocking dialogs retain priority. The emergency region participates in the actual gameplay modal scope; activating it consumes input and hides tasks without copying their private state.

Return to world remains reachable when reactions are blocked. Return to workspace restores the last nonempty permitted task, not actions, trades, gear or mode; the current mode stays visible. Repeated hits never forcibly close reopened panels. Optional alert sound uses the existing muted/volume-controlled UI channel, not fictional hearing, with no strobing or frame-by-frame announcements.

Not selected: forced camera motion, auto-opening panels, auto-resuming chores, trade rollback, shops/markets, offline reactions, unsupported device parity, legacy readers or general concurrent dressing. Required evidence is focused native/server/browser/SQL integration, affected-work measurement and independent enjoyment. No preset population/frame-time/balance guarantee follows from documentation.
