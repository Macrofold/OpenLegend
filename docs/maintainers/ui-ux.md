# UI/UX standards and qualification follow-through

[Handbook](../ui-ux/README.md) · [Essential rules](../../.agents/rules/ui-ux.md) · [Verification](../ui-ux/verification.md) · [Maintainer index](README.md)

This tracker owns follow-through for the researched interaction-design handbook, updated October 1, 2026. It does not authorize runtime redesign or duplicate inventory, spatial, hearing, narration, invention or save/load trackers. Runtime evidence baseline: `0382be7`; the research ledger retains relevant handbook and external-source revisions.

Concrete application: [PW04 inventory](next-playable-week.md#pw04--inventory-for-exact-camp-tasks), [PW05 streamed authoring](next-playable-week.md#pw05--streamed-world-agent-replies), [PW11 invention workspace](next-playable-week.md#pw11--inspectable-and-editable-invention-workspace) and PW07 generic meter/editor UI, with a shared [feature specification](../projects/next-playable-week-feature-spec.md) and [technical design](../projects/next-playable-week-tech-design.md), select a camp-supply task and owner-chat journey for the next engineering week. [Engineer 4's report](../verification/next-playable-week-engineer-4.md) distinguishes implemented client/native fixes, native/PostgreSQL checks and partial actual browser observations from the unfinished final matrix. UIUX02–UIUX05 stay open; Engineer 1 retains PW06 closure, and existing subsystem release gates remain separate.

## UIUX01

**Documentation delivered and merged; runtime conformance not asserted.** The handbook covers hierarchy/layout, controls/overlays, inventory/trading, world interaction, chat/invention, feedback, React and verification. Root/client guidance routes to a short core and matching sections only. Current aesthetics, authority, save compatibility and subsystem contracts remain unchanged.

One [research ledger](../ui-ux/research.md) integrates all 47 source groups, including pinned Primer/Adobe code and Vercel's guideline repository. Findings live in the appropriate topic chapters, not separate research-round supplements. Source dates, IDs, pins, rejected advice and access qualifications are preserved. The [principle-to-evidence map](../ui-ux/research.md#principle-to-evidence-map) connects control semantics, disabled explanations, accessibility colors, child overlays, composition, adaptive continuity, persistence and calibrated agent feedback to their evidence.

Completion means requested documentation/routes, not retroactive conformance of every screen. Tooling/native dispatch remain separately open. A company's pattern and a valid Markdown route are not proof of runtime accessibility or agent compliance.

## UIUX02

**Open — reproduce reported control defects before assigning a cause.** Inspect clear-X and typeahead in the affected browser, theme, scale and caller. Source inspection found integrated React Aria `SelectField`, shared remote `SubjectPicker` and native inventory search. The historical nesting problem was not reproduced, and the blue-X cause remains unestablished.

Acceptance when implemented: coherent combobox or intentional searchable picker, no input inside a trigger button, no duplicate native/custom clear control, quiet utility styling with visible focus, and consistent keyboard/IME/blur/clear/remote/popup behavior. Important disabled reasons need a reachable explanation. Use [Controls](../ui-ux/controls.md) and [scenarios](../ui-ux/verification.md#interaction-and-failure-scenarios); do not rewrite a functioning component from an unconfirmed diagnosis.

PW04 adds a labeled scoped destination search with named Clear, exact quantity fields, All/Half draft shortcuts and explicit submit/cancel controls. PW11 uses installed native descriptors for recipe text/number/choice fields, with complete-number feedback and reachable native mutation reasons. This covers the relevant control implementation, not keyboard/IME/focus acceptance or the unresolved historical clear-X report.

## UIUX03

**Open — qualify layout/input boundaries when those surfaces change.** Prioritize actual collisions, short/narrow overflow, text scaling, popup placement, dismissed-picker movement, wheel-through and drag/click ambiguity. Preserve selection/drafts through pane adaptation; child dismissal must not close the parent. Existing spatial/hearing trackers retain full-scene, touch and assistive-device qualification. [World contract](../ui-ux/world-interaction.md)

Record build, viewport/scale, realistic content and input method. An empty-panel screenshot or build cannot close interaction acceptance. [UXL01–05](../limits/ui-ux.md) remain proposed tuning, not runtime changes.

PW04/PW11 now separate collection and detail in a wide workspace, preserve scoped selection/drafts when one pane is shown, and provide bounded scrolling plus reachable action areas. Inventory remains mounted while hidden; recipe edits and saved-work selection also have private device persistence. Expanded workspaces use [IW01](../limits/interface.md#iw01--inventory-task-workspace), rather than changing every panel's width. [Observed desktop/short/narrow/130%-UI layouts](../verification/next-playable-week-engineer-4.md#pw04--native-inventory-and-partial-browser-checks) retain an inventory blank draft/selected knife and reachable actions; actual reservoir meter-draft adaptation is also recorded. The browser server predates the latest native metadata fixes. Final current-server/long-content/focus/popup/world-input, 200% text, native IME and assistive-device qualification remain open; a Cmd-plus attempt with no zoom change is not enlarged-text evidence.

## UIUX04

**PW04 implementation present; qualification open.** Apply [Inventory](../ui-ux/inventory.md) to scoped search, comparison, stable identity, nested storage, exact quantities, row/batch semantics and actual results. PW04 implements one concrete camp-supply workspace with lazy bounded destinations, exact transfer/offer review and native equipped-item comparison. It extends [PO04](persistent-objects.md#po04--atomic-custody-and-individual-equipment), [PO07](persistent-objects.md#po07--scoped-ui-context-and-action-discovery) and [PO10](persistent-objects.md#po10--shared-access-and-dependency-aware-handling), and supplies a scoped browser consumer relevant to [AC07.1–AC07.2](action-capabilities.md#ac07--scoped-inspection-search-and-monitoring). These broader tasks keep their own coverage; no bulk/loadout/trading acceptance is added or closed.

Native exact transfer, capacity, permission, incomplete-result and receipt scenarios are [recorded separately from partial browser evidence](../verification/next-playable-week-engineer-4.md#pw04--native-inventory-and-partial-browser-checks); the actual camp loop, large/long-content/picker/stale-result and final layout/input matrix remain open. No total stored-inventory cap was introduced; the current 40-result/200-candidate discovery window excludes cold index reconstruction and native selected-bag admission. [IW01](../limits/interface.md#iw01--inventory-task-workspace) records that scope. Measure before further grid/list density, virtualization or presets. [HV01](../limits/interface.md#hv01) is prior performance evidence, not a fresh pass. Trading needs separately scoped transaction semantics; offer changes, renewed acceptance, totals and receipts cannot be invented in presentation.

## UIUX05

**Open qualification, tied to affected feature work.** Apply [Chat/invention](../ui-ux/chat-and-invention.md) to draft identity, scroll anchors, late results, selective correction, candidate revisions and consequential approval. Distinguish capability/validation evidence from invented confidence. Existing narration/invention/save owners retain implementation; no paid retries, questionnaire protocol, generated-code permission or new background execution was added.

File concrete reproduced defects with existing feature owners. Keep optional ideas distinct from fixes; reference-product features are not automatically delivery commitments. Classify any new retained navigation/draft state under [persistence guidance](../ui-ux/system-feedback.md#classify-navigation-drafts-and-persistence).

PW11 implements exact saved-work selection/history/comparison for all seven current authoring kinds, installed-family recipe fields, stale native-preview fencing, dirty Keep/Discard, deliberate reapplication to newer revisions and original-request receipt recovery. Ordinary learned-recipe details share native output/facts/limitations with Crafting and expose no creator controls. This maps to [INV-21](inventions-and-world-evolution.md#inv-21--reviewed-mcp-authoring-and-unified-native-execution), [WW03](world-agent-writes.md#implemented-slices) and the existing WW inspection/retention owners, without completing broader live-harness, paid deployment, accessibility or large-record qualification. [Current native/UI contract](../invention-workshop-tools.md#implemented-human-saved-work-interface) · [IW02 limits](../limits/interface.md#iw02--invention-workspace)

PW05’s [bounded owner browser evidence](../verification/invention-foundation.md#pw05--incremental-owner-delivery) exercises live text identity, draft preservation, older reading/paging and final replacement. Work integration and final keyboard/IME/enlarged qualification remain in PW05/PW11; assistive-device coverage remains open.

## UIUX06

**Partially qualified — native instruction-dispatch verification remains open.** The original source/documentation review did not run the guidance checker, pinned formatter, native agent probes or browser/assistive checks. The later formatting-only fix `6664144a` passed `pnpm run format:check` and `pnpm guidance:check` on the merged handbook; it did not qualify native dispatch or browser behavior. The recorded October 1 research environment lacked `pnpm`, and fetching a pinned repository snapshot failed DNS resolution. Connector Git reads/writes remained available; this is not a claim that GitHub access was unavailable.

In a runnable checkout, run `pnpm guidance:check` and the pinned changed-file formatter without repository-wide churn. Probe a matching frontend task, backend-only negative case, new component and client-package working directory. Inspect actual context/reads: one short core plus relevant chapter sections, no compulsory research/corpus preload. Record agent versions and missing/irrelevant reads with the existing [agent-guidance tracker](agent-guidance.md). Fix concrete failures without weakening policy.

Root/client entrypoints retain selective routing; no vendor skill or duplicate handbook is added. Keep findings integrated in the existing chapters and the single source ledger. Reassess loading size if evidence shows omission or excessive context; do not copy the handbook into root instructions. Static source/document review and consolidation do not close native dispatch or gameplay qualification.
