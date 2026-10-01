# Open Legend interaction-design handbook

A practical standard for deciding what the player sees, how controls behave and how React implements them. This is not an aesthetic replacement, a gallery to copy, or a claim that the current game passes every rule.

**First research snapshot:** 2026-09-30, repository baseline `0382be76648879cf8a8397ad6c3534b4431916f5` on `Macrofold/OpenLegend/main`. **Second research and critique:** 2026-10-01, reviewing the first handbook at `e8d6c8950cadd715cfed97df4a0e379ff1593d02` on PR #26. The first pass inspected UI structure, selected implementation owners and specifications; the second adds new company guidance and pinned upstream implementation evidence. Neither ran the game or a usability study.

## Start here, not everywhere

Every UI/UX or frontend task loads the short [essential rules](../../.agents/rules/ui-ux.md), then only relevant chapter sections. A spacing correction does not require trading or either research ledger; an inventory search change normally needs Controls, Inventory and relevant React sections. Reuse already-loaded current guidance.

| Decision | Chapter |
| --- | --- |
| Information, hierarchy, size, spacing and arrangement | [Foundations and layout](foundations.md) |
| Input choice, accordion/tab/modal, coherent searchable choices | [Controls and overlays](controls.md) |
| Finding, inspecting, equipping, comparing, moving and trading objects | [Inventory and trading](inventory.md) |
| World/camera navigation without accidental actions or obstruction | [World interaction](world-interaction.md) |
| Conversations, drafts, AI work, correction and inventions | [Chat and invention](chat-and-invention.md) |
| Search, notices, settings, persistence, saves and recovery | [System feedback](system-feedback.md) |
| Component composition, state, events and accessibility | [React implementation](react.md) |
| Interaction/geometry checks and current-surface coverage | [Verification](verification.md) |
| First-pass companies, games and player reports; optional research | [First research ledger](research.md) |
| New authoritative evidence, pinned company code and corrections; optional research | [Second-pass critique and ledger](research-second-pass.md) |

## Authority and interpretation

**Rules** are prospective guardrails for in-scope work, not automatic fixes to existing violations. **Starting values** are identified tuning proposals, not scientific optima, accessibility certifications or new runtime caps. **Future patterns** describe a capability when separately selected for implementation; advanced trading/loadouts are not implied to exist.

The [UI brief](../ui-design-brief.md) owns accepted presentation/interaction behavior; the [production guide](../../apps/client/src/design-system/README.md) records implementation and explicit adaptations. [World presentation](../world-presentation.md), [spatial world](../spatial-world.md), [save/load](../save-and-load.md), [timed UI](../timed-ui.md), [hearing](../hearing-and-speech.md), [narration](../narration-and-conversations.md) and engine/authority owners retain their semantics. This handbook owns cross-cutting decision methods, not competing copies of those contracts.

Preserve the current 4px spacing system, 336px ordinary and 504px conversation/agent panel adaptations, 32px compact close/new controls, plain text tooltips, primary-action treatment, camera meanings and restrained in-world chat statuses unless explicitly revisited. Preferred touch dimensions do not silently replace approved desktop layouts; current dimensions likewise do not establish accessibility. Test and record gaps.

When guidance conflicts, retain the explicit current requirement, identify the conflict and propose a deliberate correction in its owner. Never relax a requirement to excuse a defect. Root privacy, authority, spending and [development save policy](../../AGENTS.md#development-save-policy) are not tunable UX preferences.

## Quantitative guidance without false precision

Use measurable fit, target size, decision-information coverage, task completion and state transitions. Do not justify designs with a universal golden ratio, seven-item limit, three-click rule or unsupported player-preference claim. A company's checklist is not automatically a standard; separate normative accessibility criteria, product conventions and our own proposals.

[UX tuning](../limits/ui-ux.md) records starting values and tradeoffs. Existing implemented/historical values remain in [interface limits](../limits/interface.md), [object limits](../limits/objects.md) and feature owners. A 1,000-item fixture is not an inventory cap; eight visible popup rows do not limit the searchable catalogue. The local-feedback target and a field web metric such as INP measure different things.

## Decision record: 2026-09-30

Mike requested reusable researched interaction principles and selective agent loading. The first handbook established task-first decisions, coherent controls, semantic reuse, input ownership and behavior verification while retaining current aesthetics/gameplay. Root/client guidance routes to one short rule body; details and research remain conditional.

## Decision record: 2026-10-01

At Mike's request, a second primary-source pass corrected overly broad wording and filled engineering gaps. A searchable picker is now explicitly a valid alternative to an editable combobox; disabled explanations need a reachable route; modal scope no longer implies parent-before-child dismissal. Utility styling preserves deliberate focus/forced colors. Component guidance now specifies prop/ref/event composition, and responsive guidance preserves the actual selection/draft. Persistence and agent-confidence advice is qualified by privacy and evidence rather than inherited wholesale from vendor checklists.

The [second ledger](research-second-pass.md) records sources, pins, counterexamples, rejected advice and applicability limits. These are handbook corrections, not runtime implementation or a change to existing camera bindings, dependencies, approved panel sizes, save formats or permissions. No vendor library/agent skill was added.

Browser reproduction of reported defects, numerical tuning and native agent-loading qualification remain open in [UI/UX follow-through](../maintainers/ui-ux.md). Existing subsystem trackers still own implementation; the documentation does not close their acceptance criteria.
