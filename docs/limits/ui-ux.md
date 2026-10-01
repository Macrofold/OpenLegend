# UI/UX design starting values

[Handbook](../ui-ux/README.md) · [Foundations](../ui-ux/foundations.md) · [Follow-through](../maintainers/ui-ux.md) · [Tracking rules](README.md)

These are **Proposed display-only starting values**, documented September 30–October 1, 2026 against runtime baseline `0382be7`. They are not implemented changes, universal optima, content/collection caps or an accessibility-conformance claim. Existing accepted values remain in the production guide and [interface inventory](interface.md). Evaluate these when changing a relevant surface; record adopted deviations with their owner and evidence rather than silently replacing current contracts.

## UXL01

**Proposed · Restrictiveness: Medium (layout envelope).** Use the existing 4px rhythm; initial CSS-pixel relationship ranges are 4–8 label-to-field, 8 icon-to-label, 12–16 between fields, 24–32 between semantic groups, and 16–24 comfortable panel inset. [Foundations](../ui-ux/foundations.md#spacing-and-dimensions) owns application guidance.

**Reason/tradeoff:** Consistent proximity with room for focus/errors, without turning compact game panels into spacious desktop forms. At the boundary, wrap/stack and grow content; do not clip labels or hide validation. Preserve compact adaptations until deliberately revised. Revisit with long content, enlarged text and real task observations; these are not measured optima.

## UXL02

**Proposed · Restrictiveness: Medium (reading measure).** Start longer prose at about 45–75 characters per line where the workspace permits. Short contextual labels, narrow chat and numerical tables need different measures.

**Reason/tradeoff:** Readability without taking the world away. Wrap rather than enforce a fixed minimum or shrink text. Existing 336/504px panel adaptations remain unchanged. Revisit through reading/scrolling tasks at supported text scales.

## UXL03

**Proposed · Restrictiveness: Safe (preferred target envelope, not content cap).** Prefer roughly 40px targets for new ordinary desktop controls and 44–48px for coarse-pointer/touch operation, while retaining explicitly accepted 32px compact controls until reviewed. Glyphs may remain smaller. The web AA 24×24 CSS-pixel baseline has criterion-specific exceptions; it is not a comfortable-default recommendation. [Accessibility](../ui-ux/react.md#accessibility-is-a-behavior-contract)

**Reason/tradeoff:** Easier targeting costs HUD space. Increase hit area without overlapping neighbors or adjust layout/density; never extend invisible hitboxes across another control. Qualify a retained compact exception in the actual input mode and record the tradeoff. Dimensions alone establish no accessibility pass. Viewport width alone does not identify pointer type.

## UXL04

**Proposed · Restrictiveness: Medium (composer viewport only).** Keep the current one-line initial composer. For future bounded growth, evaluate approximately six visible text lines or about 30% of available panel height, then internal scrolling or an explicit expanded editor, whichever fits the task.

**Reason/tradeoff:** Preserve conversation context and Send/recovery while allowing long drafts. This is not a character limit and never permits truncation. Short viewports/keyboards need another fit strategy, not mechanically enforcing both numbers. Existing message/draft caps stay with interface/server owners. Revisit through multiline/IME/draft-retention scenarios before adoption.

## UXL05

**Proposed · Restrictiveness: Medium (local feedback target).** Aim for visible local input/selection feedback within roughly 100ms under a declared representative device/workload. This is not a guaranteed server/storage/model duration or a new timeout.

**Reason/tradeoff:** Input should not wait for optional computation. Measure distributions and visible stalls instead of one favorable run. If the target is missed, expose truthful pending state and reduce expensive work or bound rendering; do not discard commands or invent success. The 150ms search debounce remains separately recorded in [QU15](interface.md#qu15), not applied to immediate text echo.

**Measurement scope:** Google's good-INP threshold is at most 200ms at the 75th percentile of page visits, with device-class segmentation. It is a different field metric, not an alternate value for this target, a camera frame budget or an end-to-end completion SLA. No INP measurement or telemetry collection was performed. [Source and scope](../ui-ux/research.md#s15)

No universal spinner-delay/minimum-duration or sub-500ms mutation requirement is introduced. If a future feature selects such a behavioral value, record its purpose, boundary behavior and evidence with that feature. Visual smoothing must not falsely extend pending status after a consequential completion/failure.

## Existing bounds and non-limits

The handbook changes no existing popup row counts, notice lifetimes, quick-action counts, query lengths, page sizes, camera angles, save retention or data capacity. Current values and historical qualifications remain with their owners: [HV01](interface.md#hv01), [QU11](interface.md#qu11), [QU15](interface.md#qu15), [LA223](interface.md#la223) and [object queries](objects.md).

Responsive fit equations are methods, not fixed minimum world dimensions. The handbook supplies no universal maximum menu items, inventory size or tabs; that does not declare runtime work unbounded. Existing data/authority/performance limits still apply. Test workloads are fixtures, not product restrictions. Vendor-specific pane ratios, card counts and timing conventions are not silently adopted.
