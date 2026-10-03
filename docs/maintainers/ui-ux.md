# UI/UX standards and qualification follow-through

[Handbook](../ui-ux/README.md) · [Essential rules](../../.agents/rules/ui-ux.md) · [Verification](../ui-ux/verification.md) · [Maintainer index](README.md)

This tracker owns follow-through for the researched interaction-design handbook, updated October 1, 2026. It does not authorize runtime redesign or duplicate inventory, spatial, hearing, narration, invention or save/load trackers. Runtime evidence baseline: `0382be7`; the research ledger retains relevant handbook and external-source revisions.

Proposed concrete application: [PW04 inventory](next-playable-week.md#pw04--inventory-for-exact-camp-tasks), [PW05 streamed authoring](next-playable-week.md#pw05--streamed-world-agent-replies), [PW11 invention workspace](next-playable-week.md#pw11--inspectable-and-editable-invention-workspace) and PW07 generic meter/editor UI, with a shared [feature specification](../projects/next-playable-week-feature-spec.md) and [technical design](../projects/next-playable-week-tech-design.md), select a camp-supply task and owner-chat journey for the next engineering week. These remain proposals; UIUX02–UIUX05 qualification stays open until actual interaction evidence exists.

## UIUX01

**Documentation delivered and merged; runtime conformance not asserted.** The handbook covers hierarchy/layout, controls/overlays, inventory/trading, world interaction, chat/invention, feedback, React and verification. Root/client guidance routes to a short core and matching sections only. Current aesthetics, authority, save compatibility and subsystem contracts remain unchanged.

One [research ledger](../ui-ux/research.md) integrates all 47 source groups, including pinned Primer/Adobe code and Vercel's guideline repository. Findings live in the appropriate topic chapters, not separate research-round supplements. Source dates, IDs, pins, rejected advice and access qualifications are preserved. The [principle-to-evidence map](../ui-ux/research.md#principle-to-evidence-map) connects control semantics, disabled explanations, accessibility colors, child overlays, composition, adaptive continuity, persistence and calibrated agent feedback to their evidence.

Completion means requested documentation/routes, not retroactive conformance of every screen. Tooling/native dispatch remain separately open. A company's pattern and a valid Markdown route are not proof of runtime accessibility or agent compliance.

## UIUX02

**Open — reproduce reported control defects before assigning a cause.** Inspect clear-X and typeahead in the affected browser, theme, scale and caller. Source inspection found integrated React Aria `SelectField`, shared remote `SubjectPicker` and native inventory search. The historical nesting problem was not reproduced, and the blue-X cause remains unestablished.

Acceptance when implemented: coherent combobox or intentional searchable picker, no input inside a trigger button, no duplicate native/custom clear control, quiet utility styling with visible focus, and consistent keyboard/IME/blur/clear/remote/popup behavior. Important disabled reasons need a reachable explanation. Use [Controls](../ui-ux/controls.md) and [scenarios](../ui-ux/verification.md#interaction-and-failure-scenarios); do not rewrite a functioning component from an unconfirmed diagnosis.

## UIUX03

**Open — qualify layout/input boundaries when those surfaces change.** Prioritize actual collisions, short/narrow overflow, text scaling, popup placement, dismissed-picker movement, wheel-through and drag/click ambiguity. Preserve selection/drafts through pane adaptation; child dismissal must not close the parent. Existing spatial/hearing trackers retain full-scene, touch and assistive-device qualification. [World contract](../ui-ux/world-interaction.md)

Record build, viewport/scale, realistic content and input method. An empty-panel screenshot or build cannot close interaction acceptance. [UXL01–05](../limits/ui-ux.md) remain proposed tuning, not runtime changes.

## UIUX04

**Future guidance — advanced inventory/trading implementation not authorized by the documentation request.** Apply [Inventory](../ui-ux/inventory.md) to scoped search, comparison, stable identity, nested storage, exact quantities, row/batch semantics and actual results. Existing persistent-object/action owners remain controlling.

Choose a concrete task and measure before grid/list density, virtualization, presets or enlarged workspaces. [HV01](../limits/interface.md#hv01) is prior performance evidence, not a fresh pass. Trading needs separately scoped transaction semantics; offer changes, renewed acceptance, totals and receipts cannot be invented in presentation.

## UIUX05

**Open qualification, tied to affected feature work.** Apply [Chat/invention](../ui-ux/chat-and-invention.md) to draft identity, scroll anchors, late results, selective correction, candidate revisions and consequential approval. Distinguish capability/validation evidence from invented confidence. Existing narration/invention/save owners retain implementation; no paid retries, questionnaire protocol, generated-code permission or new background execution was added.

File concrete reproduced defects with existing feature owners. Keep optional ideas distinct from fixes; reference-product features are not automatically delivery commitments. Classify any new retained navigation/draft state under [persistence guidance](../ui-ux/system-feedback.md#classify-navigation-drafts-and-persistence).

PW05’s [bounded owner browser evidence](../verification/invention-foundation.md#pw05--incremental-owner-delivery) exercises live text identity, draft preservation, older reading/paging, final replacement, mounted Work/exact-review continuity and held-question ordering. Enter/Shift+Enter, simulated composition and composer reachability at four viewport/scale combinations pass. Shared enlarged-panel layout, actual OS IME, assistive devices and delivery-capacity qualification remain open in PW05/PW11; simulation does not qualify those devices.

Independent review reproduces and fixes a large-batch scrolling defect in the actual shared conversation component: at-bottom reading now follows both new entries, while older and hidden-view anchors retain their position and new-text cue. The existing `conversation-ui.spec.ts` case still expects an owner conversation from the default-player invention form and intercepts a retired message route; it fails before composer interaction. Updating that fixture belongs to the remaining owner-browser qualification, not evidence against the focused scrolling check.

## UIUX06

**Partially qualified — native instruction-dispatch verification remains open.** The original source/documentation review did not run the guidance checker, pinned formatter, native agent probes or browser/assistive checks. The later formatting-only fix `6664144a` passed `pnpm run format:check` and `pnpm guidance:check` on the merged handbook; it did not qualify native dispatch or browser behavior. The recorded October 1 research environment lacked `pnpm`, and fetching a pinned repository snapshot failed DNS resolution. Connector Git reads/writes remained available; this is not a claim that GitHub access was unavailable.

In a runnable checkout, run `pnpm guidance:check` and the pinned changed-file formatter without repository-wide churn. Probe a matching frontend task, backend-only negative case, new component and client-package working directory. Inspect actual context/reads: one short core plus relevant chapter sections, no compulsory research/corpus preload. Record agent versions and missing/irrelevant reads with the existing [agent-guidance tracker](agent-guidance.md). Fix concrete failures without weakening policy.

Root/client entrypoints retain selective routing; no vendor skill or duplicate handbook is added. Keep findings integrated in the existing chapters and the single source ledger. Reassess loading size if evidence shows omission or excessive context; do not copy the handbook into root instructions. Static source/document review and consolidation do not close native dispatch or gameplay qualification.
