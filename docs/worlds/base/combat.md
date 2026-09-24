# Combat

The base world's initial unarmed strike is **Punch**: definition `punch`, version 1, reach 1.3 world units, automatic approach, 30 simulation seconds of wind-up, 5 injury damage and `punch` presentation. At the base clock its wind-up is half a real second. It requires a supported biped and a living, perceived target. Equipping a weapon does not modify this strike.

The authored definition lives in `packages/domain/src/worlds/base/strikes.ts`. These are base-world balance choices. The [targeted-strike runtime](../../targeted-actions.md) owns admission, approach, hit revalidation, body effects, persistence and presentation. This initial mechanic specifies one strike, not autonomous aggression or repeated attacks.
