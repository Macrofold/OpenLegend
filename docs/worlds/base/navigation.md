# Base-world navigation behavior

## Native follow

The bundled world supplies the follow tuning in `packages/domain/src/worlds/base/navigation.ts`: default separation 3 world units, accepted separation 1.5–12 units, a 0.75-unit hold/resume margin, and replanning after at least 1 unit of observed target displacement with a 4-game-second cadence. An empty route can require immediate route work. These are supplied-world choices, not universal rules for every authored reality.

The trusted executor owns movement, collision, current-perception checks and cancellation through the ordinary actor action lane. Follow currently means proximity to a visible living actor on supported ground. It ends honestly when perception, locomotion/actions capability, target viability or route support is lost. It does not implement stealth, scent, behind/beside formation, or sunset termination. Holding position remains ongoing work.

The root `follow.ts` re-export preserves current consumers of the single rule source; it is not another writable registry. A configurable installed navigation family is the extension trigger, not an unused loader now. See [capability contracts](../../action-capabilities.md), [spatial ownership](../../spatial-world.md), and [current implementation](../../architecture.md#native-follow-activity).
