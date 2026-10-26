# Emergency combat and equipment loadouts — ECL00–ECL08

## Current progress

**Design in progress; runtime implementation is not authorized by this design task.** The requested outcome is a coordinated feature/technical specification for top-center emergency reactions, a physical opening-attack delay, a focused combat presentation and fast equipment loadouts. Existing combat, inventory, custody, perception and clock owners remain authoritative until explicitly extended. No runtime or playability evidence is claimed.

**Development base:** connected GitHub repository `Macrofold/OpenLegend`, `refs/heads/main` at `beeb25179c6d772c4d3044c43e694265dd78c414`. Work branch: `design/emergency-combat-and-loadouts`. This is a remote documentation branch; no local checkout or local `main` was inspected or changed.

## Design scope and completion plan

This task changes **zero executable logic lines**. Its material risk is contradictory cross-feature contracts, particularly existing attack-mode input, physical guard/recovery, released projectiles, surprise preparedness, equipment attachment and interrupted barter. Complete the product and technical decisions, then reconcile affected current owners, design dispositions, repertoire selections, limits and navigation. Review the complete documentation diff and links before the design handoff. Runtime checks belong to the later implementation, not this documentation task.

The selected user requirements are:

- A top-center danger notification offers **Defend** and **Retaliate**. Both clear obstructing menus and enter the existing combat mode. Defend starts a short native defense; Retaliate requests one ordinary attack with the weapon currently equipped against the actual attacker.
- An initial attack on a player provides an additional reaction opportunity, initially about two normal-play seconds, by taking physically longer to land. The shared world clock never slows. Authored capabilities/effects can modify the interval.
- Saved equipment loadouts switch quickly, initially about one normal-play second, by button or shortcut. A player may designate one automatic combat-entry loadout. Leaving combat mode never equips another loadout automatically.
- Preserve useful inventory/trade work, actual completed transfers and independent NPC choices. A menu grants no immunity, global pause or ownership authority. Walking away and returning to an ordinary livelihood remain worthwhile outcomes.

## ECL00 — Complete the selected design

**In progress — design only.**

- [ ] Read the applicable current combat/input, guard, preparedness, equipment, timing, UI and documentation contracts.
- [ ] Complete the paired feature specification and technical design, with exact ordinary/emergency journeys, timing, action ordering, failures, persistence, ownership and implementation stages.
- [ ] Resolve interaction with existing attack-mode auto-entry, native recovery, unknown attackers, multiple attackers, projectile commitment and surprise evidence.
- [ ] Specify exact loadout contents, eligibility, atomic switching, automatic-entry sequencing and the supported armor/equipment boundary.
- [ ] Review the repertoire areas for relevant combinations and missing player value without promoting unrelated catalogues into requirements.
- [ ] Record authored tuning and restrictions once; reconcile overlapping design dispositions and affected owner links without closing runtime gates.
- [ ] Review the affected diff for completeness, contradictions, lost content, stale status and broken references.

**Exit:** the requested design, dependent decisions and document reconciliation are complete. ECL01–ECL08 remain explicit implementation/qualification work, not implicitly approved implementation.

## ECL01 — World policy and shared contracts

**Not started.** Establish one installed source for reaction-window, defense and equipment-transition rules; extend the existing action/body/encounter and permitted-view contracts. Client controls and saved user preferences remain distinct from fictional rules. Qualify omitted support and a materially different supported world.

## ECL02 — Physical opening reaction opportunity

**Not started.** Define and implement the once-per-encounter opening, exact physical-life binding, source-family timing integration, shared multi-attacker treatment, rearming and continuation. Preserve committed effects, recovery and the existing clock. No browser timer or private AI intention may create mechanical protection.

## ECL03 — Exact native equipment-set transition

**Not started.** Build one grouped equipment operation through the existing attachment/custody owner, including exact items, compatibility, short duration, cancellation, atomic completion and meaningful failure. Include the ordinary player, native command and current-format save paths.

## ECL04 — Defend, Retaliate and automatic-equipment ordering

**Not started.** Compose existing physical-work interruption and defense/attack admission with combat entry. An emergency reaction has priority over an automatic equipment change. Retaliate never silently substitutes a weapon, pursues an unavailable attacker, repeats attacks or bypasses required lethal review.

## ECL05 — Emergency notification and focused combat view

**Not started.** Add the top-center notice, stable exact attacker binding, accessible buttons, short threat feedback and one deliberate transition out of obstructing panels. Preserve drafts and actual receipt recovery; protect text input, pending clicks and existing modal authority.

## ECL06 — Loadout editor, shortcuts and combat-entry preference

**Not started.** Supply readable named sets, exact equipment previews, explicit unavailable-item explanations, quick switching and one opt-in automatic combat-entry selection. Use the existing input/settings and equipment inspection owners. Exiting combat mode performs no equipment action.

## ECL07 — Integrated continuation, privacy and alternate-world behavior

**Not started.** Cover interruption, transfer/trade competition, current-format save/load, control/life changes and restored drafts through existing owners. Preserve released effects and unknown delivery outcomes without duplicate actions. New mechanics must not reveal hidden attacker identity or other inventories.

## ECL08 — Qualification and player value

**Not started.** Exercise actual inventory/trade interruptions, equipment changes, natural/melee/ranged attacks, multiple attackers and peaceful escape through the ordinary native/server/browser paths. Measure the affected end-to-end workload without inventing a capacity promise. Separate mechanical correctness and accessibility checks from independent enjoyment and balance.

## Related owners

- [Combat and threat responses](combat-and-threat-responses.md): native attacks, personal encounter evidence and independent responses.
- [Skilled action execution](action-execution-and-skill-expression.md): the existing combat mode, input and release controls.
- [Preparedness and surprise](preparedness-and-surprise.md): warning registration, preparedness, surprise damage and startle; not a duplicate reaction-window timer.
- [Persistent objects](persistent-objects.md) and [inventory UX](../ui-ux/inventory.md): custody, attachments, drafts and atomic exchanges.
- [Future work needing design](needs-design.md): selected ND11/ND13/ND38 overlap; broader umbrellas and existing runtime acceptance remain separate.
