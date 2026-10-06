# Open Legend interaction-design handbook

A practical standard for deciding what the player sees, how controls behave and how React implements them. This is not an aesthetic replacement, a gallery to copy, or a claim that the current game passes every rule.

**Research updated:** October 4, 2026. **Runtime coverage updated:** October 6, 2026. **Original runtime evidence baseline:** `0382be76648879cf8a8397ad6c3534b4431916f5` on `Macrofold/OpenLegend/main`. The handbook integrates UI source/specification inspection, authoritative design and engineering guidance, pinned company code, game examples and player feedback. Exact source dates, revisions and access limits live in one [research ledger](research.md). The research baseline does not establish running-game or usability acceptance; implementation evidence is linked below.

## Game interfaces and the whole-interface redesign

The October 3 [game interface atlas](games/README.md) adds actual locally embedded screenshots, control/interaction walkthroughs, original player feedback and Open Legend applications. It includes a detailed BG3 study and RPG, survival, simulation and multiplayer comparisons. The [single research ledger](research.md#game-interface-screenshot-atlas) remains the source index; per-game dossiers hold detailed image evidence rather than a second handbook.

Mike's original request covers every interface, with inventory as an example. The initial inventory/task/chat work was too narrow. The atlas contains 98 distinct digital screenshots across 12 games, plus one excluded photograph, and [nine original layout proposals](wireframes/README.md). The [coverage map](interface-coverage.md) now connects the implemented whole-interface candidate to all 58 historical surface groups, preserving the October 4 audit at `f39cec4`. Game references, original proposals and implementation checks are separate evidence. The [pinned inventory source audit](current-interface-audit.md) remains historical evidence for the earlier diagnosis.

The [feature specification](../projects/game-interaction-redesign-feature-spec.md) and [technical design](../projects/game-interaction-redesign-tech-design.md) govern the full interface: world/HUD/targeting, Character/actions, possessions/crafting, conversation/history, entry/settings/recovery, invention/editors and operations/diagnostics. The candidate now implements the wider presentation and interaction changes: a focused play HUD and Game menu, contextual subject selection and Character sections, distinct Journal readers, retained conversation context, scoped settings/checkpoints, and clearer creator and operations workspaces. Ordinary play starts from context; meaningful creator/settings decisions retain appropriate structured editing. Existing inventory, hearing, camera, work, authoring, permissions and save mechanisms remain their semantic owners. The [current runtime mapping](interface-coverage.md#current-runtime-candidate) identifies changed, reused and conditional areas without describing every retained control as newly built.

The [verification report](../verification/game-interaction-redesign.md) records bounded interaction with production React components and the assembled App/PlayCanvas using controlled transport, plus selected native domain/projection checks. Later actual App/server/PostgreSQL sessions pass [paired inventory](../verification/game-interaction-redesign.md#native-inventory-and-focus-fixture-continuation), [partial recharge and same-database reopening in both alternate worlds](../verification/game-interaction-redesign.md#native-alternate-world-continuation-and-remaining-gates), and [creator revision review, recipe installation and original-result recovery](../verification/game-interaction-redesign.md#native-creator-recovery-and-current-required-checks). These qualify their recorded tasks; the earlier controlled checks remain distinct, and failed or insufficient observations retain their limits.

The full J01–J48 acceptance scope remains open. The latest combined continuation of person editing, checkpoint recovery, return from World operations and item/person/environment creation contains a failure under diagnosis. Remaining composed native gameplay/recovery journeys, real operating-system IME (input method editor) composition, assistive-device use, broader text/viewport combinations and uncoached player observation remain with [UIUX08–UIUX18](../maintainers/ui-ux.md#uiux08). The implemented and natively exercised alternate-world example remains distinct from arbitrary-world qualification.

The [implementation gallery](runtime/README.md) adds 44 annotated captures of the actual App and focused production components. It identifies controlled data, revisions, viewport/scale and limits for each view. These images are separate from the external game atlas and original design proposals.

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

Preserve the current 4px spacing system, 336px ordinary and 504px wide panel adaptations with deliberate workspace expansion, 32px compact close/new controls, plain text tooltips, primary-action treatment, camera meanings and restrained in-world chat statuses unless explicitly revisited. Preferred touch dimensions do not silently replace approved desktop layouts; current dimensions likewise do not establish accessibility. Test and record gaps.

When guidance conflicts, retain the explicit current requirement, identify the conflict and propose a deliberate correction in its owner. Never relax a requirement to excuse a defect. Root privacy, authority, spending and [development save policy](../../AGENTS.md#development-save-policy) are not tunable UX preferences.

## Quantitative guidance without false precision

Use measurable fit, target size, decision-information coverage, task completion and state transitions. Do not justify designs with a universal golden ratio, seven-item limit, three-click rule or unsupported player-preference claim. A company's checklist is not automatically a standard; separate normative accessibility criteria, product conventions and our own proposals.

[UX tuning](../limits/ui-ux.md) records starting values and tradeoffs. Existing implemented/historical values remain in [interface limits](../limits/interface.md), [object limits](../limits/objects.md) and feature owners. A 1,000-item fixture is not an inventory cap; eight visible popup rows do not limit the searchable catalogue. The local-feedback target and a field web metric such as INP measure different things.

## One maintained set of principles

Integrate accepted findings and corrections into the owning topic chapter and add their evidence to the research ledger. Do not create revision-specific handbooks or research supplements that readers must reconcile. Preserve useful sources, stable anchors, qualifications and decision rationale when consolidating; keep significant change history in the repository changelog rather than interleaving superseded instructions with current rules.

The handbook combines task-first decisions, coherent control alternatives, semantic reuse, preserved working context and behavior verification. Searchable pickers and comboboxes have distinct legitimate contracts; disabled explanations remain reachable; child popups dismiss before their modal parent; utility styling preserves accessibility colors. Composition, persistence and agent confidence require explicit behavior, privacy and evidence rather than wholesale adoption of vendor checklists. The [principle-to-evidence map](research.md#principle-to-evidence-map) connects these decisions to their sources.

Root/client guidance routes to one short core; details and research remain conditional. Guidance alone does not authorize vendor library/skill, runtime behavior, camera binding, dimension, save format or permission changes. The [UI/UX follow-through tracker](../maintainers/ui-ux.md) distinguishes implemented changes, bounded checks and remaining native/input/experience qualification; subsystem trackers still own their implementation and acceptance.
