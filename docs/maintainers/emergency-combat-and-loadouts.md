# Emergency combat and equipment loadouts — ECL00–ECL08

## Current progress

**ECL00: Done — designed. ECL01–ECL08: Not started.** The [feature](../projects/emergency-combat-and-loadouts-feature-spec.md), [technical design](../projects/emergency-combat-and-loadouts-tech-design.md), [world profile](../worlds/base/combat-readiness.md), [limits](../limits/emergency-combat-and-loadouts.md) and [repertoire review](../projects/emergency-combat-and-loadouts-repertoire-review.md) own the selected slice. This documentation task authorizes no runtime implementation. Last substantive review: October 27, 2026.

**Base:** connected GitHub `Macrofold/OpenLegend`, `refs/heads/main` at `beeb25179c6d772c4d3044c43e694265dd78c414`; branch `design/emergency-combat-and-loadouts`. No local checkout or local `main` was inspected or changed. Zero executable logic lines change.

**Open blocking product decisions:** None. Initial timing/protection and agent-selected interaction details are reversible hypotheses; ECL08 owns actual responsiveness, comprehension and enjoyment. Especially consequential choices remain explicit in [technical decisions](../projects/emergency-combat-and-loadouts-tech-design.md#10-decisions-and-non-goals): anonymous assistance, encounter-wide opening, current-gear reaction priority, existing lethal review, and small Brace/outfit additions.

## Selected outcome

Top-center **Defend / Retaliate** buttons deliberately hide obstructing panels and enter existing combat mode. Defense uses ordinary finite shield/Brace behavior; retaliation uses one ordinary attack with the still-equipped source against the permitted attacker. Neither bypasses preparation, recovery or exact lethal review. Return to world remains available when reactions are blocked.

The first attack gains physical preparation without slowing the world. One recipient-life encounter shares its opening across attackers. Anonymous assistance is distinct from character preparedness and targeting knowledge; observable attack timing is not promised secret. Released projectiles and later incidental interception remain physical.

Exact carried loadouts change together after short native work. Explicit Equip/mode entry may replace current work; an automatic assault/offense notice may not. Emergency reaction wins with current gear; at most one unsubmitted gear selection follows. Spent attempts never automatically retry and combat exit never equips another set. Named preset count has no feature-specific cap. Returning restores a permitted draft, not a transaction, chore or gear change. Escape and a quiet return to ordinary life are successful outcomes.

## ECL00 — Complete the selected design

**Done — design only.**

- [x] Read current combat/input, guard, preparedness, equipment, timing, identity, continuation, UI, performance and documentation owners; inspect relevant native equipment/guard/encounter sources.
- [x] Specify complete player journeys, exact timing, action/equipment ordering, failures, current-format persistence and implementation stages in the paired design.
- [x] Resolve multiple/unknown attackers, mode entry, recovery, still-equipped source validation, released-flight boundaries and separate preparedness; retain honest timing-information tradeoffs.
- [x] Map all 28 repertoire areas and relevant connected selections, not a line-by-line audit of every entry. Preserve meaningful conversation decisions and qualified comparison lessons without a transcript or invented external-game evidence.
- [x] Keep world tuning, constraints and task bodies in their respective owners; map ND overlap below without closing broader design/runtime gates. Connect the shared equipment boundary with deferred IWB02 and link the designed UX follow-on from the handbook.
- [x] Review affected content/links and existing-owner overlap. New behavior remains explicitly unimplemented; the original [decision history](../changelog/2026/2026-10-26.md) records the feature, not a diary of this review.

**Evidence limits:** repository/source and document review only. No game run, native/SQL/browser test, performance measurement, automated formatter run or independent player observation is claimed. Those belong to implementation qualification, not design completion.

## Design-register reconciliation

The [design register](needs-design.md) retains its broader ND/DG meanings. This focused tracker owns ECL's task bodies and completed refinement; it neither replaces the register nor marks unfinished parent scope complete.

| Existing scope | ECL disposition | Separate remaining scope |
| --- | --- | --- |
| ND11 / DG07 | **Done — designed:** opening opportunity, reset, commitment and assistance/knowledge boundary. | Indirect harm, rescue/lifecycle and CTR/SUR/MP qualification. |
| ND13 / DG01 | **Done — designed:** emergency transition, focused view, return and loadout controls. | Recommendation ranking/counting, arbitrary remapping and broader devices. |
| ND38 | **Done — designed:** neutral emergency action and existing mode/input integration. | ASE independent combat acceptance and other precision activities. |
| ND03 | **Done — designed for this consumer:** sampled reaction contribution and positive/negative qualification. | Further stats/progression/psychology; no compulsory Focus meter. |
| ND09 / PX02 | Existing atomic exchange remains controlling; interruption is an integration case. | Currency, merchants and deferred agreements. |
| IWB02 | Reuse the same equipment/placement preflight and commit, not a competing equip-and-stow implementation. | Explicit per-conflict bag destinations and broader deferred IWB UI; ECL stows into carried root. |

## ECL01 — World policy and shared contracts

**Not started. Dependency:** implementation authorization and current development base.

- [ ] Map current melee/natural/ranged/point-fire, body/equipment/claims, mode/input, preferences and receipt callers through the technical source map.
- [ ] Install opening/modifier, equipment timing, Brace and outfit policy once; extend generic validation/projection without bundled constants in client/prompts.
- [ ] Add minimal body/action opening and exact equipment command contracts; separate assistance from perceived encounter evidence.
- [ ] Reuse exact work-transition/idle revisions and equipment layout checks. Extract shared pure final-placement preparation for ordinary Equip and grouped sets only where needed; preserve the [IWB02 boundary](item-and-building-workflows.md#iwb02--equip-and-stow-without-accidental-loss), without implementing its deferred destination UI.

**Exit:** all actual callers and current validators share the owning contracts, including omitted support and a materially different installed profile. No new global combat flag, transaction service or generic action queue.

## ECL02 — Physical opening reaction opportunity

**Not started. Dependency:** ECL01; coordinate shared body/combat writes with ECL03/ECL04.

- [ ] Implement the [opening algorithm](../projects/emergency-combat-and-loadouts-tech-design.md#3-opening-attack-algorithm) across every supported current attack caller, including ordinary and held ranged/point-fire selection.
- [ ] Retain ordinary readiness separately; do not double-charge already extended readiness or erase a committed delay on rebinding. Use existing native phase/deadline ownership and actual start/end-driven target-life lookup.
- [ ] Implement shared encounter consumption/rearming and sampled positive/negative modifiers. Preview/inspection must not create assistance or expose hidden-recipient-dependent timing.
- [ ] Exercise canceled/missed/blocked openings, long held attacks, overlap, real release-selection boundary, live-input expiry, quiet return and same/new-life continuation. No recurring ray-recipient polling or retroactive projectile protection.

**Exit:** actual attacks/projection agree on physical timing. Assistance exposes no explicit hidden-source facts, while the observable timing tradeoff is acknowledged. Full stealth/SUR delivery is not a dependency; installed SUR keeps its own evidence cut.

## ECL03 — Exact native equipment sets and useful protection

**Not started. Dependency:** ECL01; may proceed beside ECL02 after shared-owner coordination.

- [ ] Implement grouped preflight and timed action through existing attachments/custody/claims: empty/matching sets, exact nested possessions, ports and final net capacities.
- [ ] Admit manual/explicit-mode work replacement with preparation atomically. Refusal and matching-set no-op preserve current work.
- [ ] Keep old equipment effective until atomic completion; handle replacement, competing transfer/claims and contact/completion order without partial sets, substitution or reset recovery.
- [ ] Install one ordinary craftable padded outfit/port and apply its passive physical protection once through shared impact/body calculation; no full armor catalogue or bespoke-art prerequisite.
- [ ] Connect ordinary inspection/availability, explicit player/NPC operation and current-format continuation, reusing the common layout mutation rather than a loadout-only writer.

**Exit:** actual manufactured/carried work and protective sets switch through ordinary commands with real effects and whole-operation refusal. No compulsory NPC automation or IWB destination editor is implied.

## ECL04 — Defend, Retaliate and mode-entry ordering

**Not started. Dependencies:** ECL01; ECL02 threat binding and ECL03 equipment preemption for complete integration.

- [ ] Extend the single guard owner to item/body sources, contact-family eligibility, phases, facing and recovery. Brace is not a fake item or separate timed buff.
- [ ] Use checked replacement plus ordinary action. Retaliate requires the captured source still equipped and an independently permitted attacker; no approach, repeat, automatic re-equip or implicit lethal approval.
- [ ] Coordinate explicit, notice and emergency mode entry with one opt-in selection; preserve current gear for the emergency action.
- [ ] Implement one unsubmitted convenience, review/unknown-result blocking, actual reaction binding and ordinary-command supersession. Admitted cancellation/refusal/completion spends the entry attempt.
- [ ] End replaced physical continuation without blanket consent cancellation; preserve exact receipts, released effects and owed recovery.

**Exit:** deliberate fishing→combat gear is one choice, a notice alone does not cancel work, and emergency actions never wait for or silently change source gear. No exit-set behavior.

## ECL05 — Emergency notification and focused combat view

**Not started. Dependencies:** ECL02/ECL04; ordinary guard journey may integrate before the editor.

- [ ] Build one top-center region with stable named targets, native availability and reachable blockers. Anonymous assistance cannot accuse a merely visible person.
- [ ] Render committed danger immediately on receipt, independently of the shared 500 ms loading-spinner delay. Optional UI sound respects mute; color-independent/reduced-motion and one-per-occurrence announcement do not change native time.
- [ ] Place reactions in the active gameplay overlay's legitimate focus scope; preserve text/IME and real authority blockers. Cancel transient gestures and consume activation without click-through.
- [ ] Hide tasks while retaining camera and useful combat feedback. Keep inventory, escape and Return to world reachable even when both reactions are unavailable.
- [ ] Restore the last nonempty permitted workspace with draft/scroll/selection and original receipt recovery; leave mode visibly unchanged and never auto-reopen panels or restart work.

**Exit:** real inventory/barter interruption works on desktop, narrow/short layouts, enlarged text and keyboard/pointer. Repeated hits neither close reopened panels nor erase the return point.

## ECL06 — Loadout preferences, editor and shortcuts

**Not started. Dependencies:** ECL03/ECL04; existing equipment/settings UI.

- [ ] Store exact account/world/character-scoped presets and one optional combat set in existing preference storage, outside world rewind. No feature-specific preset-count cap or new service; retain ordinary size admission and truthful save refusal.
- [ ] Provide Save current equipment, replace, rename, duplicate, delete and inspect with complete desired set/stow consequences and permitted missing-item labels.
- [ ] Offer visible Equip and named remappable ID-bound shortcuts, initially unassigned. Suppress repeat and respect text/modal ownership.
- [ ] Explain deliberate replacement versus automatic waiting and show actual waiting/changing/failure/result states. Prepare availability only for selected/visible tasks, not every saved set each frame.

**Exit:** working, protective and empty sets are useful through the real UI; one entry attempt, no remote retrieval/substitution, and no exit/reconnect replay.

## ECL07 — Integrated continuation, privacy and alternate worlds

**Not started. Dependencies:** ECL02–ECL06 integrated.

- [ ] Exercise current-format opening/guard/equipment save/load; rebuild derived indexes without renewed time or client-input replay.
- [ ] Exercise real barter/transfer competition and unknown receipts, preserving completed trades and refusing unsettled invalid trades atomically.
- [ ] Cover actual life/control/timeline/access changes, assistance versus acquired identity and permissible retained labels/drafts through ordinary projections.
- [ ] Qualify materially different installed timing/body/ports/defense and omitted support through shared owners, without base-world fallbacks or compatibility readers.

**Exit:** authenticated server and PostgreSQL continuation support the selected guarantees. No unrelated migration, legacy preservation or state-reset project.

## ECL08 — Complete qualification and player value

**Not started. Dependencies:** ECL01–ECL07. The [technical acceptance matrix](../projects/emergency-combat-and-loadouts-tech-design.md#required-functional-cases) owns scenarios.

- [ ] Run selected existing checks and connected native/server/SQL/browser cases; group scenarios around real journeys rather than add a new test suite without a request.
- [ ] Measure command-to-start, publication-to-warning and native work in a representative scene, including multiple attackers and large supported possessions/preset lists; report work examined and actual simulation progress, not an invented capacity pass.
- [ ] Observe an uncoached fishing/trading→danger→defend/fight/escape→return episode. Assess equipment understanding, usable reaction time, fairness/excitement and ordinary-life enjoyment separately from scripted correctness.
- [ ] Reconcile actual tuning, current contracts, limits and remaining evidence before feature completion. Unavailable human/hardware evidence remains open, not silently waived or inferred from screenshots.

**Exit:** all selected functional/integration requirements and explicit qualification have their actual evidence. No design-only claim of flawless implementation, established balance or universal device support.

## Related owners

[CTR combat](combat-and-threat-responses.md), [ASE input](action-execution-and-skill-expression.md), [SUR preparedness](preparedness-and-surprise.md), [persistent objects](persistent-objects.md), [inventory/barter](../ui-ux/inventory.md), [IWB equipment](item-and-building-workflows.md) and [design needs](needs-design.md) retain their wider scope and actual delivery status. ECL adds no second backlog for their unchanged requirements.
