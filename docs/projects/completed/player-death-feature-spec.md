# Player Death — feature specification

| Status    | Current progress                                                                                          | Last updated |
| --------- | --------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | Selected runtime and optional world-scar correction are delivered; broader qualification remains tracked. | 2026-10-05   |

## Purpose and accepted behavior

Make defeat costly and recoverable: a dead physical life remains in the world, while the same character continues elsewhere with fewer possessions and a scar that requires work. Mike selected true death, random retention by distinct item type, one-minute walking-distance campfire return and continuity on October 4. This replaces the earlier all-possession camp-collapse proposal. The exact current rules have one owner in [Player death and a new life](../../worlds/base/player-death.md).

## Player journey and failure cases

A fatal ordinary effect ends current work and live senses. The player sees what was retained and left behind, then explicitly chooses Continue near a campfire. A full new body arrives with **“You stumble out of the woods...”**, the same name, mind/history/relationships and one removable scar. The old body remains lootable; the player can travel back and retrieve remaining items, or another character can take them first. There is no invisible ghost, duplicated private history or automatic login revival.

All carried types count, including equipped, nested and borrowed possessions. Stacks/split lots cannot multiply a type's chance; quantities are conserved and bags/content can take different fates without duplication. The odd extra type is lost. No valid campfire leaves the saved partition intact and explains that a usable rest spot must be restored. Camp placement is checked, not a guaranteed invulnerability zone. Current corpse decay releases unclaimed objects to ground rather than deleting them.

### Death scars

Stiff leg slows walking, unsteady hands reduces outgoing injury and tender chest increases incoming injury. Repeated category scars add required treatments rather than compound the penalty. Treat at camp with prepared fiber and uninterrupted work; injury, leaving or death interrupts without early debit. Existing descriptive personality traits and the lasting-injury repertoire provide future ideas, but these first mechanical scars are authored body effects, not a new universal traits framework.

Mike's October 5 correction makes scars optional for another authored world: the same death/Continue flow can retain every item and add no scar, without treatment dependencies. The bundled world continues to require its selected scars. [Current policy boundary](../../worlds/base/player-death.md#death-scars).

## Acceptance and delivery

Qualify actual fatal gameplay, exact odd/zero/one-type and giant-stack selection, split/nested/equipped/borrowed custody, simultaneous competing pickup, repeated death, missing/invalid campfire, random distinct-fire choice/nearest fallback, current-format cold restoration, stale target life/creator revival, death during fade, rot/removal and ground loot. Browser death summary/Continue/scar treatment must work with keyboard and compact layouts without scouting from the corpse. The [report](../../verification/first-threat-encounter.md) states actual evidence and remaining wider balance/scale qualification.

Stages use the [first-threat integrated plan](first-threat-encounter-tech-design.md#conditional-implementation-breakdown): one body/custody transaction, checked Continue/life placement, scars/treatment, UI/projections and persistence qualification. No dependency on town construction, NPC resurrection or another PG assignment is introduced.

## Choices and expansion

Mike delegated rounding, full new-life physiology, usable cold fires, no unsafe emergency fallback and noncompounding scars/treatment costs. [Selected choices and alternatives](first-threat-encounter-tech-design.md#concrete-owner-decision-list) remain available for critique. Future towns, constructed rest spots, more scars and difficult ordinary NPC revival require new authored consumers; they are not missing pieces of the delivered campfire flow.

## Maintained records

- Implementation: [PG05](../../maintainers/parallel-batch-03-personal-game.md#pg05--first-threat-encounter-design), [BW14](../../maintainers/base-world.md#accepted-lifecycle-and-protection-delivery), [DG07/ND11](../../maintainers/needs-design.md#dg07--human-participation-and-recoverable-conflict), [MP04](../../maintainers/multiplayer.md#mp041--participation-and-bounded-exit-contract).
- Limits and constraints: [FT01–FT07](../../limits/base-world.md#ft01--proposed-first-threat-scope-and-reward), [native work](../../limits/native-work.md), [objects](../../limits/objects.md), [persistence](../../limits/persistence.md).
- Related contract/design: [Current authored encounter](../../worlds/base/first-threat-encounter.md), [lifecycle/protection](../../worlds/base/lifecycle-and-protection.md), [verification](../../verification/first-threat-encounter.md), [D07/PS-D01 decision record](../../../archive/05-project/open-decisions.md#pg05--proposed-first-encounter-choices).

- Related counterpart: [Technical design](player-death-tech-design.md).
