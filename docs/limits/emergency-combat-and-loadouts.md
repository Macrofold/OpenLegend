# Emergency combat and loadout limits

**Selected design, not measured runtime capacity.** [Feature](../projects/emergency-combat-and-loadouts-feature-spec.md) · [Technical design](../projects/emergency-combat-and-loadouts-tech-design.md) · [ECL delivery](../maintainers/emergency-combat-and-loadouts.md). The [world profile](../worlds/base/combat-readiness.md) owns fictional values; this inventory records their kind, rationale and reconsideration/qualification boundary.

## ECL-L01 — Opening time and encounter scope

**World-owned tuning:** base additional preparation two normal-play seconds; effective allowance clamped to 0.5–4 after the installed reaction bonus; ten quiet normal-play seconds to rearm after relevant continuing work ends. Convert once to the shared simulation clock. No independent browser/host clock, global slowdown or client-acknowledgement extension.

**Behavioral restriction:** one opening per recipient life/encounter, shared across attackers. Cancellation/miss/block/zero injury consumes the admitted opening; menu/mode/equipment changes and reconnect cannot renew it. Applies to supported direct and pre-release ray threats, not retroactive collateral from an already released projectile or environmental harm. This is an attack-preparation opportunity, not guaranteed two seconds of visible UI, guaranteed survival or universal first-damage immunity.

**Rationale:** useful first counterplay without repeated fight stalling, world-wide time changes or a second projectile system. **Reconsider through:** actual ordinary attack, ranged/late-binding and multi-attacker play; measure whether quiet rearming permits cheap repeated feints or makes separated encounters unfair. Balance may change in the world owner; the once-per-episode and physical-commitment semantics remain explicit.

## ECL-L02 — Assistance and information

**Authored capability:** the initial targeted player attack can expose an anonymous incoming-danger cue without sensory identification. This is an explicit player-assistance tradeoff, not private actor knowledge. No hidden name, position, weapon or targetable body is disclosed; ordinary experience determines recognition and preparedness separately. A visible person's identity cannot be joined to a private attack target; naming the source requires its independently permitted attack association.

**UI restriction:** one expanded emergency region, stable action binding during a held/focused activation, and only personally disclosed additional threats. A banner does not close menus, act, stop time or make the player invulnerable. Native pause, control and maintenance restrictions remain.

**Reconsider through:** an unseen archer, a known attacker leaving view, unrelated nearby fighting, a warning while typing, and a resumed ongoing encounter. Verify absence of hidden-source identifiers in the actual protocol, not merely hidden visible text.

## ECL-L03 — Finite defense and protective gear

**World tuning:** ordinary shield guarding retains its existing 0.25-second preparation, up-to-three-second ready period, one connecting eligible contact and one-second recovery at normal speed. The initial body brace shares timing/coverage semantics but reduces supported direct melee injury by 20% and does not intercept projectiles. The initial outfit contributes 20% reduction to remaining supported direct physical injury; its admitted profile range is 0–0.4.

**Restrictions:** no passive auto-guard, invulnerability, parry stun, new stamina/Focus meter, universal anatomy, armor class, durability or stack-every-item protection rule. Facing, current equipment, real contact and actual phase decide the result. The first outfit occupies one authored port and is obtained through the world-owned ordinary recipe. Additional equipment families need their own supported meaning.

**Reconsider through:** shield versus brace, rear versus front contact, arrows versus melee, recovery refusal, actual crafted outfit and shield/outfit composition. A percentage in a tooltip is not evidence that all native contact paths apply it exactly once.

## ECL-L04 — Equipment transition and preset storage

**World tuning:** one normal-play second for a complete grouped set change, independent of set size. Old gear remains active until atomic completion; walking or an explicit reaction can replace unfinished work. Existing single-item equip behavior is not changed merely to match this duration.

**Product/storage bound:** initially **12 named loadouts per account/world/character scope**, with each set containing no more distinct equipment items than the supported body has equipment ports. This bounds the simple existing preference payload and permits varied work/social/combat sets without a new paginated preset service. It is not an inventory-size, armor-slot or engine-world count limit. Explain the limit when creating a thirteenth set; rename, replace and delete remain available. Revisit if actual players need more; do not silently discard a set.

**Identity and custody restrictions:** exact individualized objects and definition pins; currently carried accessible possessions only; complete desired set including omissions; whole-set refusal on missing/incompatible/claimed objects; no silent partial result, same-name substitute, remote retrieval or healing. Current item condition is read at execution, not permanently frozen into the preset.

**Work bound:** exact selected/displaced equipment, occupied ports and existing affected containment ancestors. Do not scan every world item, recursively enumerate unrelated bags, or evaluate every saved set every frame. Existing request/body-definition/object-access bounds still apply.

## ECL-L05 — Automatic action and user control

**Finite convenience:** at most one equipment attempt per true off-to-on combat-mode transition and one not-yet-submitted selection in the current foreground scope. Default is None. A deliberate mode switch with the preference enabled may replace current work, just like manual Equip; a mode notice from incoming assault/own offense may not. An explicit Defend/Retaliate uses current gear first and can carry the same unsubmitted selection behind its confirmed action/recovery, without allocating another attempt.

Ordinary new movement/attack commands, manual equipment choices, mode exit, blur/pause/disconnect or scope/life changes clear the pending convenience. A refused/declined reaction clears it; unresolved review/results block dispatch. If a reaction cancels an already admitted equipment action, that mode entry's attempt is spent and is not automatically retried. Native rules decide any already admitted work.

**Restriction:** no automatic retries after cancellation/refusal, no resubmission of an uncertain effect, no forced set interrupting repeated chosen actions and no automatic set on combat exit. Reconnect, repeated hits and old mode notices are not new entries. Missing combat gear leaves actual old equipment/work intact. A manual Equip control remains available independently.

**Reconsider through:** explicit mode entry while fishing versus notice-driven entry, reaction during gear preparation, ordinary manual fighting before an idle boundary, an unavailable preset, slow response/unknown receipt and mode exit immediately before/after commit. Preserve the intended distinction between an attempt, an unsubmitted convenience and actually equipped gear.

## ECL-L06 — Interaction and acceptance boundaries

Existing right-click/context and camera bindings remain. New Defend and per-loadout shortcut actions are remappable but initially unassigned; every action has a visible keyboard-operable control. Text/IME, child overlays and blocking authority dialogs retain input ownership. A reaction consumes its input and hides ordinary menus in one deliberate transition, preserving the existing task owner rather than copying its private data. Repeated reactions do not erase the last nonempty workspace return point.

**Not selected:** forced camera motion, automatic reopening of large panels, automatic resumption of interrupted work, trade rollback, new shop/market rules, offline reaction automation, controller parity without evidence, legacy readers or a general concurrent-action framework.

**Required evidence:** actual native/server/browser/SQL journeys, focused input/access checks, changed-work performance measurement and independent enjoyment observation. No fixed frame-time, reaction-latency, population or balance target is claimed from this design. Measure the entire affected caller, actual work examined and native time advanced; distinguish publication delay from physical preparation and correctness from human preference.
