# Open Legend interaction-design handbook

A practical standard for deciding what the player sees, how controls behave and how React implements them. This is not an aesthetic replacement, a gallery to copy, or a claim that the current game passes every rule.

**Research updated:** October 1, 2026. **Runtime evidence baseline:** `0382be76648879cf8a8397ad6c3534b4431916f5` on `Macrofold/OpenLegend/main`. The handbook integrates UI source/specification inspection, authoritative design and engineering guidance, pinned company code, game examples and player feedback. Exact source dates, revisions and access limits live in one [research ledger](research.md). No running-game or usability study is implied.

## Start here, not everywhere

Every UI/UX or frontend task loads the short [essential rules](../../.agents/rules/ui-ux.md), then only relevant chapter sections. A spacing correction does not require trading or the research ledger; an inventory search change normally needs Controls, Inventory and relevant React sections. Reuse already-loaded current guidance.

| Decision                                                                                                | Chapter                                     |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Information, hierarchy, size, spacing and arrangement                                                   | [Foundations and layout](foundations.md)    |
| Input choice, accordion/tab/modal, coherent searchable choices                                          | [Controls and overlays](controls.md)        |
| Finding, inspecting, equipping, comparing, moving and trading objects                                   | [Inventory and trading](inventory.md)       |
| World/camera navigation without accidental actions or obstruction                                       | [World interaction](world-interaction.md)   |
| Conversations, drafts, AI work, correction and inventions                                               | [Chat and invention](chat-and-invention.md) |
| Search, notices, settings, persistence, saves and recovery                                              | [System feedback](system-feedback.md)       |
| Component composition, state, events and accessibility                                                  | [React implementation](react.md)            |
| Interaction/geometry checks and current-surface coverage                                                | [Verification](verification.md)             |
| Authoritative guidance, company code, games, player reports and applicability limits; optional research | [Research and exemplar ledger](research.md) |

## Authority and interpretation

**Rules** are prospective guardrails for in-scope work, not automatic fixes to existing violations. **Starting values** are identified tuning proposals, not scientific optima, accessibility certifications or new runtime caps. **Future patterns** describe a capability when separately selected for implementation; advanced trading/loadouts are not implied to exist.

The [UI brief](../ui-design-brief.md) owns accepted presentation/interaction behavior; the [production guide](../../apps/client/src/design-system/README.md) records implementation and explicit adaptations. [World presentation](../world-presentation.md), [spatial world](../spatial-world.md), [save/load](../save-and-load.md), [timed UI](../timed-ui.md), [hearing](../hearing-and-speech.md), [narration](../narration-and-conversations.md) and engine/authority owners retain their semantics. This handbook owns cross-cutting decision methods, not competing copies of those contracts.

Preserve the current 4px spacing system, 336px ordinary and 504px conversation/agent panel adaptations, 32px compact close/new controls, plain text tooltips, primary-action treatment, camera meanings and restrained in-world chat statuses unless explicitly revisited. Preferred touch dimensions do not silently replace approved desktop layouts; current dimensions likewise do not establish accessibility. Test and record gaps.

When guidance conflicts, retain the explicit current requirement, identify the conflict and propose a deliberate correction in its owner. Never relax a requirement to excuse a defect. Root privacy, authority, spending and [development save policy](../../AGENTS.md#development-save-policy) are not tunable UX preferences.

## Quantitative guidance without false precision

Use measurable fit, target size, decision-information coverage, task completion and state transitions. Do not justify designs with a universal golden ratio, seven-item limit, three-click rule or unsupported player-preference claim. A company's checklist is not automatically a standard; separate normative accessibility criteria, product conventions and our own proposals.

[UX tuning](../limits/ui-ux.md) records starting values and tradeoffs. Existing implemented/historical values remain in [interface limits](../limits/interface.md), [object limits](../limits/objects.md) and feature owners. A 1,000-item fixture is not an inventory cap; eight visible popup rows do not limit the searchable catalogue. The local-feedback target and a field web metric such as INP measure different things.

## One maintained set of principles

Integrate accepted findings and corrections into the owning topic chapter and add their evidence to the research ledger. Do not create revision-specific handbooks or research supplements that readers must reconcile. Preserve useful sources, stable anchors, qualifications and decision rationale when consolidating; keep significant change history in the repository changelog rather than interleaving superseded instructions with current rules.

The handbook combines task-first decisions, coherent control alternatives, semantic reuse, preserved working context and behavior verification. Searchable pickers and comboboxes have distinct legitimate contracts; disabled explanations remain reachable; child popups dismiss before their modal parent; utility styling preserves accessibility colors. Composition, persistence and agent confidence require explicit behavior, privacy and evidence rather than wholesale adoption of vendor checklists. The [principle-to-evidence map](research.md#principle-to-evidence-map) connects these decisions to their sources.

Root/client guidance routes to one short core; details and research remain conditional. No vendor library/skill, runtime behavior, camera binding, approved dimension, save format or permission changes are implied. Browser reproduction of reported defects, numerical tuning and native agent-loading qualification remain open in [UI/UX follow-through](../maintainers/ui-ux.md); subsystem trackers still own implementation.
