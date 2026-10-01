# UI/UX design starting values

[Handbook](../ui-ux/README.md) · [Foundations](../ui-ux/foundations.md) · [Follow-through](../maintainers/ui-ux.md) · [Tracking rules](README.md)

These are **Proposed display-only starting values**, introduced by the 2026-09-30 research/documentation pass at baseline `0382be7`. They are not implemented changes, universal scientific optima, content/collection caps or a claim of accessibility compliance. Existing accepted values remain in the production design-system guide and [interface inventory](interface.md); do not duplicate or silently replace their entries. Evaluate a starting value when its surface is implemented or changed, and record adopted deviations with their owner and evidence.

## UXL01

**Proposed · Restrictiveness: Medium (layout envelope).** Use the existing 4px rhythm; initial relationship ranges in CSS pixels are 4–8 label-to-field, 8 icon-to-label, 12–16 between fields, 24–32 between semantic groups, and 16–24 comfortable panel inset. The [foundations table](../ui-ux/foundations.md#spacing-and-dimensions) owns application guidance.

**Reason/tradeoff:** Consistent proximity and enough room for focus/errors without turning every compact game panel into a spacious desktop form. At the boundary, wrap/stack and grow content; do not clip labels or erase validation. Existing compact adaptations remain authoritative until deliberately revised. Revisit with long content, enlarged text and actual task observations; these ranges are not measured optima.

## UXL02

**Proposed · Restrictiveness: Medium (reading measure).** Start longer prose at approximately 45–75 characters per line where the available workspace permits. Short contextual labels, narrow chat panels and numerical tables need different measures.

**Reason/tradeoff:** A readable line length without taking the world away from the player. Wrap to available width rather than enforce a fixed minimum or shrink text. This does not change existing 336/504px panel adaptations. Revisit after actual reading/scrolling tasks at supported text scales.

## UXL03

**Proposed · Restrictiveness: Safe (preferred pointer-target envelope, not a content cap).** Prefer roughly 40px targets for new ordinary desktop controls and 44–48px for coarse-pointer/touch operation, while preserving existing explicitly accepted 32px compact controls until reviewed. The glyph can remain smaller. The web AA baseline of 24×24 CSS px has criterion-specific exceptions and is not a recommended comfortable default; see [accessibility guidance](../ui-ux/react.md#accessibility-is-a-behavior-contract).

**Reason/tradeoff:** Easier targeting costs HUD space. Increase the hit region without overlapping neighboring targets, or change layout/density; do not expand invisible hitboxes across other controls. When a compact exception is retained, qualify it in the actual input mode and document the tradeoff. No accessibility pass is inferred from dimensions alone.

## UXL04

**Proposed · Restrictiveness: Medium (composer viewport only).** Preserve the current one-line initial composer. For a future bounded growth behavior, evaluate a visible growth envelope around six text lines or about 30% of the available panel height, then internal scrolling or an explicit expanded editor, whichever provides usable editing in that surface.

**Reason/tradeoff:** Keep conversation context and the send/recovery controls visible while supporting long drafts. This is not a character limit and never permits truncating text. Short viewports and software keyboards require an alternate fit strategy, not mechanically enforcing both numbers. Existing message/draft caps remain with their interface/server owners. Revisit through multiline/IME/draft-retention tasks before adoption.

## UXL05

**Proposed · Restrictiveness: Medium (local feedback target).** Aim for visible local input/selection feedback within roughly 100ms under a declared representative device/workload. This is an engineering target for local responsiveness, not a guaranteed end-to-end server, storage or model latency and not a new timeout.

**Reason/tradeoff:** A responsive interaction should not wait for optional computation. Measure latency distribution and worst visible stalls rather than cite one favorable run. At the boundary, show truthful pending state, reduce expensive work or use bounded rendering; never discard a command or invent success to meet the target. Existing 150ms search debounce remains recorded in [QU15](interface.md#qu15), separately from immediate text echo.

## Existing bounds and non-limits

This pass changes no existing popup row count, notice lifetime, quick-action count, search query length, page size, camera angle, save retention or data capacity. Current values and historical qualifications remain with their owners, including [HV01](interface.md#hv01), [QU11](interface.md#qu11), [QU15](interface.md#qu15), [LA223](interface.md#la223) and [object queries](objects.md).

Responsive fit equations are decision methods, not new fixed minimum world dimensions. The handbook deliberately supplies no universal maximum menu-item count, inventory size or number of tabs. That is not a declaration that runtime work is unbounded: existing data, authority and performance limits still apply. Test workloads in the verification chapter are fixtures, not product restrictions.
