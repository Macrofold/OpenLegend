# Player death and a new life

Current bundled-world behavior, implemented October 4, 2026. [death.ts](../../../packages/domain/src/worlds/base/death.ts) and the installed [body policy](../../../packages/domain/src/worlds/base/body-policy.ts) own the rules. Other authored worlds may choose a different supported lifecycle.

## Death and possessions

Zero health truly kills the player's current physical life. One separate, lootable corpse stays at that location; the stable player keeps the same name, identity, knowledge, relationships and personal history. The corpse has a body, not another mind, control lease or private-history copy. Dead players have no live senses, movement, attacks or off-screen depletion. Their death summary is an own-inventory snapshot, not remote access to later corpse loot.

Count distinct carried item definition types, including equipped, nested and borrowed possessions. A stack of 100 stones counts as one type; splitting it into many lots does not create more chances. Uniformly choose `floor(type count / 2)` types to retain using saved randomness. All lots/quantities of each type share one fate. The odd extra type is left behind; zero types retain none, one type is lost. This gives an exact half rather than independent coin flips or value estimates. It discourages giant worthless stacks from padding retention, while deliberately not solving padding with many worthless types.

Containers count as their own type independently of contents. Same-fate nesting remains; a child whose fate differs from its bag moves to the appropriate root custody. Nothing is cloned, destroyed or compressed into a second loot bag. Equipment is unequipped. Ownership declarations remain unchanged; the corpse's abandoned custody is lootable through ordinary pickup and bag access. The first valid completed pickup wins; remaining items can be retrieved by the returned player or taken by another active player.

## Continue near a rest spot

Continue explicitly creates the next physical iteration under the same identity. Reconnecting alone does not revive anyone. Choose uniformly among distinct usable campfires within 396 straight-line world units of death: one real minute of nominal normal walking (0.11 units/game second × 60 game seconds/real second × 60 seconds). Current injury, route length and playback speed do not alter that radius. If none are usable in range, choose the nearest usable campfire; stable identity breaks equal-distance ties. One candidate is simply used. A cold campfire is still a rest spot; towns/other rest families and campfire construction are future content.

Placement chooses among eight checked points 1.8 units around the campfire on its actual supporting surface. Geometry, occupancy and nearby contact reach are checked; unusable points/fires are skipped. This avoids immediate overlapping contact, but does not promise camp-wide invulnerability or inspect hidden future intentions. No usable campfire leaves the pending death and retained possessions intact with an explicit refusal, requiring the creator to restore a usable rest spot. There is no emergency free fire or unsafe teleport.

The new life receives full health, food and energy and clears old injury/burning/wetness, motion and unfinished work. A physical-life identifier changes so old attacks, permissions and routes cannot affect the successor. The arrival reads **“You stumble out of the woods...”**; the existing name-template renderer separately records that the character stumbled out, preserving grammatical personal memories. The old body, supplies already spent and other world consequences remain.

## Death scars

These penalties are an authored choice of this bundled world. The shared reincarnation service also accepts `scars: []` and `treatment: null`: death then adds no scar, consumes no scar-selection randomness and needs no treatment material or time. A world can combine that with `retainedTypeFraction: 1` to keep all possessions. Nonempty scar definitions require valid treatment; existing saved scars or active treatment cannot silently outlive their installed definitions. [Execution boundary](../../projects/completed/player-death-tech-design.md#optional-world-scars-correction).

Every death adds one uniformly selected removable bodily scar:

| Scar           | Consequence until treated      |
| -------------- | ------------------------------ |
| Stiff leg      | Walk 20% slower                |
| Unsteady hands | Inflict 20% less attack injury |
| Tender chest   | Receive 20% more injury        |

Repeated selection of a category adds treatment work, not another multiplicative penalty in that category. Different categories combine. This makes death consequential without trapping the player under exponential impairment; full new-life physiology does not clear scars. These are mechanical bodily scars, distinct from the existing descriptive personality trait bank. [BSP037's lasting-injury repertoire](../../repertoires/bodies-species.md) supplies expansion ideas; no general trait/scar catalog framework is required for these first three.

Treat one scar by spending one prepared fiber and 600 uninterrupted game seconds within 2.2 units of a campfire. At normal speed this is ten real seconds. Injury or leaving reach interrupts it. Material is debited only at successful completion, after rechecking the scar, campfire, current reach and unreserved directly carried material; cancellation/death/stale completion cannot debit twice. Move material out of a bag before treatment. Ordinary resting remains available and does not automatically remove a scar.

## Corpse decay, absence and durability

Existing three-game-day rot and seven-game-day physical removal apply. Unclaimed possessions move to ground custody through the remains owner; decay does not erase them. The retained identity does not become an invisible continuously simulated ghost. Repeated deaths produce separate corpses and exact type selections, never duplicate the same life. Ordinary creator revival refuses a pending player or an old player corpse with a successor; native/NPC creator revival increments physical life so old attacks/reviews stay stale. Ordinary NPC revival/summoning remains BW15.

A death strictly before [fade expiry](player-danger.md#five-simulated-seconds-to-leave) leaves a corpse and pending Continue; expiry protects the absent identity, not the corpse or its loot. Authenticated return supplies one controllable identity, not automatic respawn. Current-format saves retain the coupled corpse/partition/scar/random state and departure deadline. Continue uses durable command acknowledgement; native death has the existing simulation durability window. Incompatible development saves are rejected, with no migration or automatic reset/deletion.

## Maintained records

- Implementation: [BW14](../../maintainers/base-world.md#accepted-lifecycle-and-protection-delivery), [DG07/ND11](../../maintainers/needs-design.md#dg07--human-participation-and-recoverable-conflict), [MP04](../../maintainers/multiplayer.md#mp041--participation-and-bounded-exit-contract).
- Limits and constraints: [FT07](../../limits/base-world.md#ft07--accepted-danger-reincarnation-and-simulated-fade), [objects](../../limits/objects.md), [native work](../../limits/native-work.md), [persistence](../../limits/persistence.md).
- Related contract/design: [feature specification](../../projects/completed/player-death-feature-spec.md), [technical design](../../projects/completed/player-death-tech-design.md), [lifecycle and protection](lifecycle-and-protection.md), [verification](../../verification/first-threat-encounter.md).
