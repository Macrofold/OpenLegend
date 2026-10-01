# UI/UX standards and qualification follow-through

[Handbook](../ui-ux/README.md) · [Essential agent rules](../../.agents/rules/ui-ux.md) · [Verification scenarios](../ui-ux/verification.md) · [Maintainer index](README.md)

This tracker owns follow-through introduced by the 2026-09-30 interaction-design documentation request. It does not authorize a runtime redesign or duplicate the existing inventory, spatial, hearing, narration, invention or save/load implementation trackers. Read those owners when changing their behavior. Baseline: `0382be7`.

## UIUX01

**Documentation delivered in this branch; runtime conformance not asserted.** The handbook covers information hierarchy/layout, controls/overlays, inventory/trading, world interaction, chat/invention, system feedback, React and verification, with a dated source ledger. Root/client routing loads one short essential rule and only matching chapters. Existing aesthetics, authority, save compatibility and subsystem contracts remain unchanged.

Completion is delivery of the requested documentation and routes, not retroactive compliance of every existing screen. Machine checks and native dispatch are separately tracked below; do not describe the entire guidance system as verified from Markdown links alone.

## UIUX02

**Open — reproduce reported control defects before assigning a cause.** Inspect the clear-X and typeahead in the affected browser, theme, UI scale and caller. Source inspection found an integrated React Aria `SelectField`, a shared remote `SubjectPicker` and a native inventory search input. It did not reproduce the earlier nested-control problem or prove why an X appears blue.

Acceptance when implemented: one coherent searchable choice; no duplicate native/custom clear utility; quiet semantic styling with visible focus; keyboard, IME, blur, clearing, remote results and popup placement behave consistently across relevant callers. Use the [control contract](../ui-ux/controls.md) and [verification matrix](../ui-ux/verification.md#interaction-and-failure-scenarios). Do not rewrite the shared selector solely on the assumption that the historical defect remains present.

## UIUX03

**Open — qualify layout and input boundaries when those surfaces change.** Prioritize actual panel collisions, short/narrow viewport overflow, text scaling, popup placement, dismissed-picker walk-through, wheel-through and drag/click ambiguity. Existing spatial and hearing trackers retain full-scene, touch and assistive-device qualification; this entry links the common [world/input contract](../ui-ux/world-interaction.md) rather than creating a second camera specification.

Acceptance evidence must identify the build, viewport/scale, content and input method. A screenshot of an empty panel or a passing build does not close the interaction cases. Proposed spacing/target values are in [UXL01–05](../limits/ui-ux.md), not implemented changes.

## UIUX04

**Future feature guidance — no advanced inventory/trading implementation authorized by this request.** When inventory grows, apply the [inventory chapter](../ui-ux/inventory.md) to scoped search, comparison, stable identity, nested storage, exact quantities, multi-selection and clear results. Preserve the current persistent-object and action authority owners.

Select a concrete task and measure it before choosing grid/list density, virtualization, presets or a larger workspace. Existing [HV01](../limits/interface.md#hv01) performance evidence remains a real starting point, not a new pass. Trading needs a separately scoped transaction contract before UI work; offer changes, renewed agreement, totals and receipts cannot be invented in presentation alone.

## UIUX05

**Open qualification, tied to affected feature work.** Apply [chat/invention scenarios](../ui-ux/chat-and-invention.md) to draft retention, conversation identity, scroll anchoring, late results, exact candidate revisions and consequential approval. Existing narration/invention/save owners retain behavior and implementation work. This handbook introduces no automatic paid retries, new typed-question protocol, generated-code permission or background execution.

Use the relevant existing tracker when a concrete defect is reproduced. Keep hypothetical enhancements separate from required fixes; do not turn every reference-product feature into a delivery commitment.

## UIUX06

**Open — tooling and native instruction-dispatch verification.** This connector-only pass did not execute `pnpm guidance:check`, the pinned changed-file formatter, native agent-loading probes or browser/assistive-technology checks. Static content and Git diff review are narrower evidence.

In a runnable checkout, run the existing guidance checker and changed-file formatter without repository-wide formatting churn. For loading, inspect actual context in a matching frontend task, backend-only negative case, new-component case and client-package working directory. The expected route is one short core plus only relevant chapters; no mandatory research/corpus preload. Record agent versions and missing/irrelevant reads under the existing agent-guidance verification workflow. Fix concrete link/trigger failures without weakening unrelated policy.

The current core is deliberately a summary, not a substitute for the relevant interaction contract. Reassess its length if agents consistently omit important rules or load excessive detail; do not duplicate the full guide into root instructions.
