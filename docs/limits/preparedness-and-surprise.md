# Preparedness and surprise — limits and constraints

This inventory owns F's discretionary choices. The [feature specification](../projects/preparedness-and-surprise-feature-spec.md), [technical design](../projects/preparedness-and-surprise-tech-design.md) and [SUR tracker](../maintainers/preparedness-and-surprise.md) distinguish design completion from runtime delivery. Numerical defaults have one canonical table in [base combat](../worlds/base/combat.md#preparedness-policy). All new settings below are **Proposed — selected design targets, unimplemented and unmeasured**.

## SUR-L01 — Damage amplification and eligible outcome

**Restrictiveness: Medium.** The selected world's initial 2× direct-contact multiplier applies once through the existing contact calculation, before physical reduction and body susceptibility. The designated first outcome rule prevents multi-contact/packet multiplication or banking a missed initial attempt for a later hit. Current families have one melee outcome or one stopping projectile contact. Broader multi-contact families must supply the technical contract before they can advertise support.

The gain makes a truly unanticipated attack consequential; existing hit, protection, recovery and harm permissions remain. With the current profiles, nominal injury changes from 8 to 16 for the [starter knife](base-world.md#bw08), 5 to 10 for [Punch](../worlds/base/combat.md#equipped-melee), and 18 to 36 for the [territorial stag](../worlds/base/first-threat-encounter.md). Those calculations preserve a meaningful opening advantage without making any of these attacks a nominal one-hit kill against an uninjured person at the [authored initial 100 health](../../packages/domain/src/worlds/base/attributes.ts). They are not survival guarantees: wounds, susceptibility, scars, independent simultaneous attacks and other weapon profiles still matter. SUR09 must compare survival, counterplay and escape through the complete encounter; no critical-hit/backstab stack or new armor system is selected.

## SUR-L02 — Native registration and preparation lead

**Restrictiveness: Medium.** The world table selects positive normal-speed intervals for receiving a definite warning and earning deliberate scoped anticipation. The registered/body-eligible transition is distinct from successful evasion or physical guard readiness. Exact boundary equality is eligible; no tolerance or client latency can supply missing simulated time.

These intervals preserve a meaningful early/late warning distinction without making native protection depend on model response speed. They are gameplay hypotheses, not physiological measurements. No additional Perception, Composure or fear factor changes these intervals in the initial policy; their existing sensory/emotional owners retain their effects. An alternative supported world may select zero lead, but must retain acquired-cut ordering and cannot use an impact as its own warning.

The selected warning lead exceeds the current knife's 0.10-normal-second wind-up, so a previously unwary person who first notices that close strike during wind-up can still receive surprise injury. The knife's next uninterrupted attempt is a full 0.40-second cycle later, allowing the first acquired attack to register before that next attempt. Punch's 0.50-second and the stag's 2-second wind-ups can instead supply enough lead when their physical threat is actually noticed early. These are calculated timing comparisons, not claims that every cue is perceived or that a human can respond in time. Keep this fast-weapon tradeoff visible in SUR09; if repeated knife openings make ordinary meetings unreasonably lethal, adjust the authored multiplier/lead with the weapon and warning timings together. The deliberate lead overlaps the shield's existing 0.25-second preparation rather than adding another wait.

## SUR-L03 — Retained expectation and genuine unwary return

**Restrictiveness: Medium.** The world table selects finite warning retention and a separate quiet-settling interval. They belong to personally supported encounter evidence, not CTR's contextual-action grace. No stale observation, repeated command, rendering, model prose, republication of stale visibility of the same commitment or source alias refreshes them.

Genuine continuous threat confirmation can hold its actual supported scope; this is fresh observation, not republication. Actual acquired attack evidence or a real own committed offense can retain already mature matching anticipation, including through guard consumption or recovery. Broad and narrow source continuation remain distinct; unrelated work cannot preserve broad readiness.

Evidence-free watch has no residual coverage. This prevents scanning/guard cycling from accumulating all-direction immunity. Actual directed attack evidence can establish finite ordinary-physical-assault expectation; general danger, mere identity and one's unrelated hunting action cannot. Other scopes remain source/region/approach-specific. SUR09 assesses whether the selected reset is understandable and whether it supports both escape and later ambush.

Six seconds of retention plus two seconds of quiet settling outlast the current knife's 0.30-second recovery and the stag's 3-second recovery. A single ordinary recovery or brief obstruction therefore cannot by itself reset a fight. At the selected human walking pace, eight uninterrupted normal-play seconds could cover 52.8 metres before terrain or other constraints; the interval permits meaningful separation rather than rewarding a single backward step. Continuous relevant evidence and fully matching scoped work retain their own terms. These comparisons justify an initial finite window; they do not establish an optimal chase distance or make CTR's separate ten-second action preference a bodily preparedness rule.

## SUR-L04 — Initial supported families and absent channels

**Restrictiveness: Safe.** Selected consequences cover current admitted natural/equipped contact strikes and straight physical projectiles. No multiplier for periodic injury, poison, fire, hunger, fall damage, arbitrary traps, structure damage, status ticks or invented effect prose is inferred. Future families need explicit contact/damage/cause and permission integration.

E's six closed physical preparation adapters remain authoritative. Ordinary observation without selected anticipation gives no immunity. D's native contact/cue families own shock; a wholly unperceived miss cannot shock. There is no general armor or unconsciousness subsystem added here. World/module omission is allowed with explicit neutral consequence; missing required installed data is incomplete/error, not omission.

## SUR-L05 — Growing work, retention and overload

**Restrictiveness: Too liberal until SUR08/SUR09 qualification; no new arbitrary gameplay cap.** Active retained state grows with actual observer-local threat scopes/support, concurrent admitted actions/flights and necessary consumption receipts. There is no nearest-N threat cap or display-sized mechanical prefix. Correctness identities, privacy and once-only effects are invariants rather than tunable limits.

Use CTR's participant-owned records and indexes; merge only semantically identical scopes with preserved support/frontiers, expire live derived expectation, and leave canonical history/receipts in their existing cold retention owners. No per-frame world scan, all-history impact query, duplicate readiness store, new scheduler, synchronous SQL or required model call is admitted. Attack producers reserve complete required work before mutation. Existing [native work](native-work.md) holds incomplete physical progress coherently; it cannot award surprise because a warning was dropped.

SUR08 must count capture candidates, active-support cardinality, derived record bytes, complete effect inputs and due work through real callers, including concentrated many-to-one warning, many projectiles, cold restore and corrections. Accepted live work remains complete under the existing budget; concrete capacity policy changes require their owning inventory and measured evidence. Optional diagnostic explanation can be bounded with an explicit omitted count, never by changing the result.

## Related inventories

- [Shared stealth](stealth-awareness.md#sa-l02--initial-surprise-damage-multiplier) retains its original shared decision IDs and links here for F detail.
- [Combat and threat responses](combat-and-threat-responses.md) owns contextual grace, native responses, decision work and independent acceptance.
- [Feelings](feelings.md), [state effects](state-effects.md), [spatial](spatial.md), [memory](memory.md) and [native work](native-work.md) retain their respective shared constraints.
- [SUR01–SUR09](../maintainers/preparedness-and-surprise.md) owns implementation and reconsideration work; no duplicate generic limits-audit task is required.
