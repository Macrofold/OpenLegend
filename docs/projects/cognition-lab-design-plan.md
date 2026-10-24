# Cognition Lab — design delivery plan

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | The feature, technical contracts, repertoire coverage and linked implementation work are being specified; runtime implementation is not authorized by this design task. | 2026-10-24 |

## Agreed scope and completion

Design a compact developer workspace at `/cognition` for editing isolated character situations, running the ordinary game cognition and actions, inspecting actual processing, and comparing behavior. A normal speech experiment must be immediately usable; advanced controls must not displace the current character, composer or result. Preserve the complete agreed conversation, including the correction that the left pane always displays current editable information and historical decision inputs belong only on the right.

This task changes documentation only: zero executable logic lines. The material design risks are duplicated game behavior, misleading request previews, accidental gameplay-data coupling, inconsistent edit/stop semantics, overwhelming navigation, and marking research or runtime work complete merely because a tool is designed.

## Delivery sequence

1. Establish the exact source baseline and applicable instructions; reuse unchanged source evidence and inspect changed owners.
2. Specify the ordinary speech journey, fixed controls, scrolling ownership, compact geometry, direct inspection links, keyboard/focus behavior, and all advanced flows in the feature specification.
3. Specify the shared runtime and isolation boundary, commands and event intake, editor and request contracts, experiment execution, persistence, diagnostics and performance in the technical design.
4. Review all 28 canonical repertoire catalogues for relevant behavior and missing capabilities; map selected examples to worthwhile playable episodes without promoting every proposed mechanic into delivery scope.
5. Create focused implementation tasks and limits; reconcile overlapping needs-design dispositions and current semantic owners. Preserve outstanding implementation, model-quality, usability and gameplay acceptance.
6. Review the complete resulting change for conversation coverage, source fidelity, executable contract clarity, unnecessary complexity, UI usability, cross-document consistency and valid links. Fix concrete findings and commit the complete documentation.

## Source and coordination

Base: GitHub `Macrofold/OpenLegend`, `main`, commit `795dae71d1cf6a2e846ebfaaeb7c70342bc01f66`. Design branch: `codex/cognition-lab-design`. The emotional-physiology design on `codex/design-stealth-02-emotions` is a referenced dependency, not an implicitly integrated runtime capability.

The feature specification owns observable behavior and interaction. The technical design owns implementation contracts. The repertoire review owns catalogue-to-episode coverage. The focused maintainer file owns tasks and acceptance status; the limits inventory owns discretionary bounds. Shared memory, action, character, UI and save contracts remain authoritative where unchanged.

All project prose describes the selected current design; editing history belongs in Git and the existing documentation changelog. Incompatible development data requires no migration, old-format support or preservation project. Current-format save/load and real external-account effects retain their existing owners.

## Verification for this documentation task

- Review every changed hunk and all new documents, including removed text and changed completion claims.
- Validate relative link targets and authored anchors against the complete repository tree and fetched source; verify links to the separate emotion branch explicitly.
- Check stable work IDs, counterpart/status/limits links, repertoire identifiers and conversation coverage.
- Run the existing pinned formatter on changed Markdown where available; otherwise disclose the formatting-tool limit and perform the available structural review.
- Do not claim runtime, browser, model-quality, throughput or player-enjoyment evidence from this design. Runtime acceptance remains in the implementation tracker. No game services, browser trials or paid model calls are required for document verification.

## Maintained records

- [Feature specification](cognition-lab-feature-spec.md)
- [Technical design](cognition-lab-tech-design.md)
- [Repertoire coverage and playable episodes](cognition-lab-repertoire-review.md)
- [Implementation and acceptance](../maintainers/cognition-lab.md)
- [Limits and constraints](../limits/cognition-lab.md)
