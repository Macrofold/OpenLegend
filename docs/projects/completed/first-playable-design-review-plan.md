# First-playable design critique and revision

| Status    | Current progress                                                                                                                                                | Last updated |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | Independent critique and revisions resolved the identified design defects; implementation and actual player qualification remain open in their existing owners. | 2026-10-17   |

## Scope and base

Review and improve the complete first-playable design under Mike's explicit request. This is design-only: zero executable logic lines or saved-world changes. The main risks are contradictory world rules, impractical player burdens, impossible physical actions and incomplete implementation instructions. The existing [world specification](../first-playable-world-feature-spec.md) and [technical design](../first-playable-world-tech-design.md) remain the product and integration owners.

Continue branch `codex/first-playable-complete-design-20261017` at `10d4e6731fca6c9720f0d6d99ff1832dbed79c8f`. The verified default of `https://github.com/Macrofold/OpenLegend.git` is `origin/main`, freshly fetched at `0543f9ec61301240c5c4ec3cd007063f4f1c25d6`; reconciliation required no history change. Review the complete branch diff against that base, not only the last checkpoint.

## Review and revision steps

1. Independently critique survival/progression, camps/physical defense and people/roaming against the actual owners, gameplay priorities and existing research. Trace plausible ordinary choices, failures, elapsed time and continued play rather than accepting component availability as player value.
2. Check the integrated world/engine split, startup/continuation, atomic permissions, read-only disclosure, finite work and implementation ordering. Preserve exact existing content and supported scenarios unless a justified design improvement explicitly changes them.
3. Fix concrete findings in each canonical feature/technical pair, authored-world profile, limits and focused tasks. Parent owns integration/layout/changelog; delegated reviewers own disjoint subsystem documents. Coordinate changed inputs/outputs before editing neighboring owners.
4. Reconcile the combined contracts and reread every affected diff. Distinguish confirmed contradictions from design hypotheses and retain actual implementation/player acceptance as open work.
5. Run repository-pinned formatting, whitespace, local file/heading and incoming-reference checks plus syntax checks for changed YAML examples. Record actual scope/limits, commit all task changes and leave the branch clean.

## Completion criteria

Every confirmed in-scope finding is resolved or explicitly justified; selected improvements have exact behavior, ownership, lifecycle, bounds and implementation acceptance. No silent change to private evidence, operational authority, independent choice or protected development-save policy. The design review is complete only after documentation reconciliation and checks; it does not claim runtime feasibility, independent model quality or player enjoyment from paper reasoning.

## Maintained records

[FPW integration](../../maintainers/first-playable-world.md), [FPV acceptance](../../maintainers/first-playable-validation.md) and the subsystem trackers linked from the world pair retain implementation ownership. The [documentation changelog](../../documentation-changelog.md) records consequential decisions; this plan is not a second implementation backlog.

## Review conclusions and accepted revisions

- **The camp was not physically usable as specified.** Raise the gate supports and rails to clear a standing body, provide a real hand opening for outside operation, and reconcile both enclosure sizes, material recipes and offcuts. The aperture also admits physically valid sight/projectile paths. The open basket gains one narrowly supported contents-exposure form; it organizes material without magically keeping rain out. Broader nesting remains outside this selected mechanic.
- **Routine survival imposed unnecessary input, while invention had weak demonstrated value.** Add a deliberate finite meal through the existing one-unit eating owner without automatic future meals or changed metabolism. Compare the full cost and later value of an invented method against a known route; the selected ranged-hunting hypothesis must pass actual generation, manufacture and meaningful reuse. Correct finite resource totals to include the retained woodland sources.
- **Predator movement and attack timing could not support the intended hunt.** Select faster pursuit with visible moving preparation, actual contact at the original deadline and preserved recovery. Make regrouping depend on personal sight, vary initial prey hunger and remove the stag's identity-based immunity. Authored habitat/supply familiarity can produce useful travel; it cannot direct a character to the player, guarantee contact or prescribe an interaction. Real escape, obstruction and misses remain possible.
- **Cooperation and startup had incomplete continuation contracts.** Ending consent detaches continuing committed physical work from live cooperation ownership without granting another step. Ordinary sight loss while reading an invitation does not erase a previously identified quarry or grant tracking. Admit source-dependent recipes only after actual sources exist; derive construction rights only from eligible material outcomes; keep the existing Main opening selected until the complete replacement qualifies.

These changes deliberately add only the missing computations needed by selected mechanics. Authored values, content and fictional policies remain in the world configuration; generic physical motion, custody, exposure, consent, persistence and authorization retain their existing semantic owners. No interactions, successful responses, visits or victories are scripted.

## Evidence and limits

The reviewers inspected the relevant implementation owners, existing specifications and complete affected subsystem diffs. Paper geometry and timing exposed the physical contradictions; they do not establish runtime behavior, provider usefulness, performance, balance or enjoyment. No runtime code, saved worlds or paid provider calls changed. Existing FPW/SV/SH/CP/RW tasks and FPV acceptance retain all implementation and player qualification work.

Final checks passed: repository-pinned formatting and whitespace across the 26 documents changed by this review; 3,136 relative file/heading references across the full branch's 44 changed documents; 697 incoming heading references; and all six embedded YAML examples parsed without syntax errors or duplicate keys. These are documentation checks, not runtime or configuration-schema qualification. This completed record describes the design review, not completion of those implementation projects.
