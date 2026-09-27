# Combat

## Equipped melee

The knife is an installed item profile consumed by the general contact-strike family. It must be explicitly equipped; each chosen action approaches once, winds up, resolves one hit/miss and recovers. [BW08](../../limits/base-world.md#bw08) owns the numerical balance. The normal player/NPC/plan admission path binds the exact item and target; neither hunger nor an animal's presence selects it automatically.

A miss produces a real `struck` outcome and the attacker's private awareness, including why no damage occurred. Surviving prey can flee after the attempt. Another strike needs another chosen action or an explicitly admitted plan step. Native moving-prey, alternate-profile and restore checks pass; [live autonomous hunting and visual acceptance remain open](../../verification/embodied-survival.md).

The base world's initial unarmed strike is **Punch**: definition `punch`, version 1, reach 1.3 world units, automatic approach, 30 simulation seconds of wind-up, 5 injury damage and `punch` presentation. At the base clock its wind-up is half a real second. It requires a supported biped and a living, perceived target. Equipping a weapon does not modify this strike.

The authored definition lives in `packages/domain/src/worlds/base/strikes.ts`. These are base-world balance choices. The [targeted-strike runtime](../../targeted-actions.md) owns admission, approach, hit revalidation, body effects, persistence and presentation. This initial mechanic specifies one strike, not autonomous aggression or repeated attacks.

## Accepted lethal-action direction

The initial Punch implementation does not complete the [deliberate lethal-consequence policy](lifecycle-and-protection.md#deliberate-lethal-consequences). Human PvP consent, death confirmation and the final-blow/incapacitation choice remain delivery work in BW14; NPC ghost continuity is BW15. Do not make these main-world choices universal strike-runtime laws.
