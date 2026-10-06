# Combat

## Equipped melee

The knife is an installed item profile consumed by the general contact-strike family. It must be explicitly equipped; each chosen action approaches once, winds up, resolves one hit/miss and recovers. [BW08](../../limits/base-world.md#bw08) owns the numerical balance. The normal player/NPC/plan admission path binds the exact item and target; neither hunger nor an animal's presence selects it automatically.

A miss produces a real `struck` outcome and the attacker's private awareness, including why no damage occurred. Surviving prey can flee after the attempt. Another strike needs another chosen action or an explicitly admitted plan step. Native moving-prey, alternate-profile and restore checks pass; [live Jev-only hunting and miss-aware retries are demonstrated](../../verification/embodied-survival.md#minimal-context-and-equipment-derived-hunting). Visual acceptance and broader behavioral reliability remain open under [AG13](../../maintainers/agent-agency.md#ag13--embodied-survival-demonstration).

The base world's initial unarmed strike is **Punch**: definition `punch`, version 1, reach 1.3 world units, automatic approach, 30 simulation seconds of wind-up, 5 injury damage and `punch` presentation. At the base clock its wind-up is half a real second. It requires a supported biped and a living, perceived target. Equipping a weapon does not modify this strike.

The authored definition lives in `packages/domain/src/worlds/base/strikes.ts`. These are base-world balance choices. The [targeted-strike runtime](../../targeted-actions.md) owns admission, approach, hit revalidation, body effects, persistence and presentation. This initial mechanic specifies one strike, not autonomous aggression or repeated attacks.

## Accepted lethal-action direction

Human-issued supported strikes/hunts now require [one exact potentially lethal attack confirmation](player-danger.md#final-blow-confirmation), and the [territorial stag](first-threat-encounter.md) uses an explicitly granted natural-contact profile through the same attack owner. Player death uses [corpse/half-type/scar continuity](player-death.md); NPC and animal deaths persist without ordinary revival. Broader human PvP, attributed indirect harm and rescue remain BW14/D07, and NPC ghosts/ordinary revival remain BW15. These are installed world choices rather than universal strike laws.
