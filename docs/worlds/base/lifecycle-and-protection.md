# Lifecycle and player protection

Accepted target for the OpenLegend main/bundled world, September 25, 2026. These policies are not universal engine laws and are not yet fully implemented. Current actor identity/revival remains in [Architecture](../../architecture.md#actor-means-any-living-being); delivery is BW13–BW15 and MP01/MP04.

## Human logout and return

After logout/disconnection, finish or safely interrupt current interactions during a short bounded exit period. Disconnecting must not instantly erase an admitted consequence or permit an indefinite action to prevent exit. Then the character visibly fades out for onlookers and leaves active world participation. Emit a committed departure action/event through normal scoped perception so witnessing agents can notice it; do not broadcast private connection/account details or grant awareness to non-witnesses. Preserve character identity, belongings, history and return state.

After exit, the human character is inactive and protected from bodily harm and survival depletion until returning. This does not freeze the shared world or advance personal starvation off-screen. Reconnect reconciles any existing exit before restoring one controlled embodiment; duplicate sessions cannot duplicate a person or inventory. Exact exit timing and interrupted-action recovery are tuning work. A hidden but connected tab is distinct from logout and follows the [sensory policy](../../../archive/07-technical-architecture/perception-and-attention.md#embodied-visual-parity).

## Human conflict and recovery

Cooperative play is the default. Harmful player-versus-player actions require explicit participation in a clearly identified mode or area, enforced by action admission rather than a warning alone. Human death is recoverable without permanent character loss; default recovery preserves possessions. Additional penalties must be explicit world settings. Rescue/return presentation, cooldowns and opt-in enforcement details remain to be specified before release.

Buildings and other world property are **not protected merely because their owner is offline**. The long-term building/property protection policy is TBD; do not infer protection from the human body's inactive state.

## NPC death, ghosts and revival

NPC death preserves identity, history, relationships and the continuity needed for a ghost. A dead NPC is retained outside active world participation by default, not a continuously simulated invisible actor. Supported summoning mechanics can give that ghost an embodiment capable of conversations; outside such summoning it does not exist as an active presence in the world. Preserve the same person's knowledge/privacy and avoid duplicate bodies, inventories or concurrent living/ghost control. Exact summoning mechanics, duration, embodiment capabilities and revival mechanics are TBD. This does not automatically give a non-speaking animal human speech or a mind.

Reviving a beloved NPC is possible but difficult through ordinary gameplay. Existing authorized creator revival is a separate administrative capability and is not made difficult by this rule. Ghost persistence is continuity, not an automatic return to ordinary life.

## Deliberate lethal consequences

The main world must make killing consequential: these characters have histories and may matter to other players. Before a human intentionally commits a lethal action against a character, require clear confirmation, for example: “Are you sure you want to kill [character name]? They will remain dead until someone revives them, which is difficult.” Show meaningful permitted context about the loss. A friend count is a possible presentation, not authority to reveal private directional relationships or invent a relationship score.

A distinct final death-blow action and default incapacitation/fainting are candidate implementations; choose the exact combat mechanism before delivery. Confirmation must bind to the current target/action and cannot authorize unrelated later killing. Track indirect hazards, queued attacks, NPC combat and permission changes explicitly so a modal is not mistaken for a complete lethal-action rule. Ordinary environmental consequences and risky creator law changes retain their own approved policies.

## Maintained records

- Implementation: [Feature tasks](../../maintainers/base-world.md).
- Limits and constraints: [Bundled-world defaults inventory](../../limits/base-world.md).
