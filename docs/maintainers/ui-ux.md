# UI/UX standards and qualification follow-through

[Handbook](../ui-ux/README.md) · [Essential rules](../../.agents/rules/ui-ux.md) · [Verification](../ui-ux/verification.md) · [Maintainer index](README.md)

This tracker owns follow-through from the 2026-09-30 interaction-design request and the 2026-10-01 primary-source critique. It does not authorize runtime redesign or duplicate inventory, spatial, hearing, narration, invention or save/load trackers. Original runtime baseline: `0382be7`; second-pass handbook baseline: `e8d6c89`.

## UIUX01

**Documentation delivered on the PR #26 branch; runtime conformance not asserted.** The handbook covers hierarchy/layout, controls/overlays, inventory/trading, world interaction, chat/invention, feedback, React and verification. Root/client guidance routes to a short core and matching sections only. Current aesthetics, authority, save compatibility and subsystem contracts remain unchanged.

The second pass adds [20 source groups](../ui-ux/research-second-pass.md), including pinned Primer/Adobe implementation observations and Vercel's guideline repository. It directly corrects searchable-picker semantics, disabled explanations, utility/focus color interpretation and child-overlay priority, then strengthens composition, adaptive continuity, persistence and calibrated agent feedback. First-pass research remains labeled historical evidence rather than being silently rewritten.

Completion means requested documentation/routes, not retroactive conformance of every screen. Tooling/native dispatch remain separately open. A company's pattern and a valid Markdown route are not proof of runtime accessibility or agent compliance.

## UIUX02

**Open — reproduce reported control defects before assigning a cause.** Inspect clear-X and typeahead in the affected browser, theme, scale and caller. Source inspection found integrated React Aria `SelectField`, shared remote `SubjectPicker` and native inventory search. Neither pass reproduced the historical nesting problem or established the blue-X cause.

Acceptance when implemented: coherent combobox or intentional searchable picker, no input inside a trigger button, no duplicate native/custom clear control, quiet utility styling with visible focus, and consistent keyboard/IME/blur/clear/remote/popup behavior. Important disabled reasons need a reachable explanation. Use [Controls](../ui-ux/controls.md) and [scenarios](../ui-ux/verification.md#interaction-and-failure-scenarios); do not rewrite a functioning component from an unconfirmed diagnosis.

## UIUX03

**Open — qualify layout/input boundaries when those surfaces change.** Prioritize actual collisions, short/narrow overflow, text scaling, popup placement, dismissed-picker movement, wheel-through and drag/click ambiguity. Preserve selection/drafts through pane adaptation; child dismissal must not close the parent. Existing spatial/hearing trackers retain full-scene, touch and assistive-device qualification. [World contract](../ui-ux/world-interaction.md)

Record build, viewport/scale, realistic content and input method. An empty-panel screenshot or build cannot close interaction acceptance. [UXL01–05](../limits/ui-ux.md) remain proposed tuning, not runtime changes.

## UIUX04

**Future guidance — advanced inventory/trading implementation not authorized by these requests.** Apply [Inventory](../ui-ux/inventory.md) to scoped search, comparison, stable identity, nested storage, exact quantities, row/batch semantics and actual results. Existing persistent-object/action owners remain controlling.

Choose a concrete task and measure before grid/list density, virtualization, presets or enlarged workspaces. [HV01](../limits/interface.md#hv01) is prior performance evidence, not a fresh pass. Trading needs separately scoped transaction semantics; offer changes, renewed acceptance, totals and receipts cannot be invented in presentation.

## UIUX05

**Open qualification, tied to affected feature work.** Apply [Chat/invention](../ui-ux/chat-and-invention.md) to draft identity, scroll anchors, late results, selective correction, candidate revisions and consequential approval. Distinguish capability/validation evidence from invented confidence. Existing narration/invention/save owners retain implementation; no paid retries, questionnaire protocol, generated-code permission or new background execution was added.

File concrete reproduced defects with existing feature owners. Keep optional ideas distinct from fixes; reference-product features are not automatically delivery commitments. Classify any new retained navigation/draft state under [persistence guidance](../ui-ux/system-feedback.md#classify-navigation-drafts-and-persistence).

## UIUX06

**Open — tooling and native instruction-dispatch verification.** The first pass did not run the guidance checker, pinned formatter, native agent probes or browser/assistive checks. The second pass inspected additional primary-source code and revised the docs; it still did not run those checks. The local environment had no `pnpm`, and fetching a pinned repository snapshot into it failed DNS resolution. Connector Git writes remained available; this is not a claim that GitHub access was unavailable.

In a runnable checkout, run `pnpm guidance:check` and the pinned changed-file formatter without repository-wide churn. Probe a matching frontend task, backend-only negative case, new component and client-package working directory. Inspect actual context/reads: one short core plus relevant chapter sections, no compulsory research/corpus preload. Record agent versions and missing/irrelevant reads with the existing [agent-guidance tracker](agent-guidance.md). Fix concrete failures without weakening policy.

The second pass does not change root/client entrypoint routing or add vendor skills. Core wording now permits valid alternatives and points to focused details. Reassess loading size if evidence shows omission or excessive context; do not copy the handbook into root instructions. Static source/document review does not close native dispatch or gameplay qualification.
