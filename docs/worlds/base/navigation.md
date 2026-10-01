# Base-world navigation behavior

## Native follow

The bundled world supplies the follow tuning in `packages/domain/src/worlds/base/navigation.ts`: default separation 3 world units, accepted separation 1.5–12 units, a 0.75-unit hold/resume margin, and replanning after at least 1 unit of observed target displacement with a 4-game-second cadence. An empty route can require immediate route work. These are supplied-world choices, not universal rules for every authored reality.

The trusted executor owns movement, collision, current-perception checks and cancellation through the ordinary actor action lane. Follow means keeping near a visible living actor on supported ground. It ends honestly when perception, locomotion/actions capability, target viability or route support is lost. Holding position remains ongoing work. It does not implement stealth, scent or hidden tracking.

A follow may also choose:

- **Relation** `behind`, `beside`, `left` or `right`: a stance judged from the direction the follower actually saw the target travel. At least 0.5 world units of observed movement gives that direction; with less evidence, or when the stance point is not walkable ground on the target's surface, the follower holds at the ordinary near distance. A held stance allows 1 world unit of drift before moving again. `beside` keeps whichever side of the target the follower starts on; `left` and `right` are the target's own sides (right-handed, Y-up world frame).
- **Loss policy** `last-seen`: on losing sight, walk to the position recorded while the target was last visible and stop there. A new sighting continues the follow only in the same encounter or with authored recognition; otherwise the follower stops at that place rather than re-identifying someone by hidden identity.
- **Stopping time** `until` a [named clock time](time.md#named-clock-times): the follow completes successfully at that instant.

Following and targeted work record where the actor itself last saw that subject; at most eight such private remembered places are kept per actor, oldest forgotten first. "Go to where I last saw X" walks to that record, not to X's live position.

The root `follow.ts` re-export preserves current consumers of the single rule source; it is not another writable registry. A configurable installed navigation family is the extension trigger, not an unused loader now. See [capability contracts](../../action-capabilities.md), [spatial ownership](../../spatial-world.md), and [current implementation](../../architecture.md#native-follow-activity).
